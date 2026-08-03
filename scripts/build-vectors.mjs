// ==========================================================================
//  build-vectors.mjs — populate public.movie_vectors for the recommender.
//
//  WHAT IT DOES
//  ------------
//  1. Assembles a ~5k-film corpus: TMDB top-rated ∪ popular, unioned with every
//     film in any user's watchlist/watched (so a user's own films are always
//     recommendable / excludable).
//  2. Fetches each film's genres + keywords + credits in one call
//     (append_to_response=keywords,credits).
//  3. Builds an explainable vocabulary — the fixed 19 TMDB genres, plus the top
//     KEYWORD_DIM keywords and top PEOPLE_DIM people (director + top billed cast)
//     by corpus frequency — and assigns each a stable dimension.
//  4. Emits one multi-hot, L2-normalized vector per film and upserts it (plus
//     display metadata + popularity) into public.movie_vectors, and rewrites
//     public.movie_vector_vocab.
//
//  The vector LAYOUT must stay in lockstep with schema.sql's vector(519):
//    genres 19  |  keywords 300  |  people 200   →  TOTAL_DIM 519
//
//  RUN
//  ---
//    TMDB_TOKEN, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY must be
//    set (the first two are read from .env.local automatically; the service key
//    should be passed inline so it never lands on disk):
//
//      SUPABASE_SERVICE_ROLE_KEY=<service-role-key> node scripts/build-vectors.mjs
//
//    or `npm run build:vectors` with the key exported. Re-run monthly.
// ==========================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---- vector layout (KEEP IN SYNC WITH schema.sql) ------------------------
const GENRE_IDS = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36,
  27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37,
]; // 19 fixed TMDB genres
const GENRE_DIM = GENRE_IDS.length; // 19
const KEYWORD_DIM = 300;
const PEOPLE_DIM = 200;
const TOTAL_DIM = GENRE_DIM + KEYWORD_DIM + PEOPLE_DIM; // 519

// ---- tunables ------------------------------------------------------------
const TARGET_CORPUS = 5000; // rough size before adding user-list films
const CAST_TOP = 5;         // top-billed cast counted as "people" per film
const CONCURRENCY = 20;     // parallel TMDB detail fetches
const UPSERT_CHUNK = 500;

const TMDB_BASE = "https://api.themoviedb.org/3";

// ---- env -----------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotEnvLocal(path.join(__dirname, "..", ".env.local"));

const TMDB_TOKEN = process.env.TMDB_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_TOKEN) die("Missing TMDB_TOKEN (set it in .env.local).");
if (!SUPABASE_URL) die("Missing NEXT_PUBLIC_SUPABASE_URL (set it in .env.local).");
if (!SERVICE_KEY) die("Missing SUPABASE_SERVICE_ROLE_KEY (pass it inline; do NOT commit it).");

// Talk to PostgREST directly with fetch rather than @supabase/supabase-js: the
// SDK constructs a realtime WebSocket client that needs Node 22+, which this
// job doesn't need. Service-role key → RLS is bypassed.
const REST = `${SUPABASE_URL}/rest/v1`;
const DB_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function dbSelect(table, query) {
  const res = await fetch(`${REST}/${table}?${query}`, { headers: DB_HEADERS });
  if (!res.ok) throw new Error(`${table} select ${res.status}: ${await res.text()}`);
  return res.json();
}
async function dbInsert(table, rows) {
  const res = await fetch(`${REST}/${table}`, {
    method: "POST",
    headers: { ...DB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table} insert ${res.status}: ${await res.text()}`);
}
async function dbUpsert(table, rows, onConflict) {
  const res = await fetch(`${REST}/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { ...DB_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table} upsert ${res.status}: ${await res.text()}`);
}
async function dbDelete(table, filter) {
  const res = await fetch(`${REST}/${table}?${filter}`, {
    method: "DELETE",
    headers: { ...DB_HEADERS, Prefer: "return=minimal" },
  });
  if (!res.ok) throw new Error(`${table} delete ${res.status}: ${await res.text()}`);
}

// ==========================================================================
//  main
// ==========================================================================
async function main() {
  await preflight();

  const ids = await collectCorpusIds();
  log(`Corpus: ${ids.length} unique films. Fetching details…`);

  const films = await fetchAllDetails(ids);
  log(`Fetched ${films.length} film details (${ids.length - films.length} failed/skipped).`);

  const { keywordDim, peopleDim, vocabRows } = buildVocabulary(films);
  log(`Vocabulary: ${keywordDim.size} keywords, ${peopleDim.size} people.`);

  const rows = [];
  for (const f of films) {
    const vec = buildVector(f, keywordDim, peopleDim);
    if (!vec) continue; // no usable features → not recommendable
    rows.push({
      tmdb_id: f.id,
      title: f.title,
      year: f.year,
      poster: f.poster,
      rating: f.rating,
      genre: f.primaryGenre,
      popularity: f.popularity,
      embedding: `[${vec.join(",")}]`, // pgvector text form
    });
  }
  log(`Built ${rows.length} vectors. Writing to Supabase…`);

  await replaceVocab(vocabRows);
  await upsertVectors(rows);
  log(`Done. movie_vectors now holds ${rows.length} films.`);
}

// Fail fast if the schema hasn't been applied yet, rather than crawling ~5k
// films first and only discovering the missing table at write time.
async function preflight() {
  try {
    await dbSelect("movie_vectors", "select=tmdb_id&limit=1");
  } catch (e) {
    die(
      `Can't reach public.movie_vectors (${e.message}).\n` +
        `  → Re-run schema.sql in Supabase (it creates the vector extension + tables) and try again.`
    );
  }
}

// ==========================================================================
//  1. corpus assembly
// ==========================================================================
async function collectCorpusIds() {
  const ids = new Set();

  // TMDB top-rated ∪ popular, alternating until we hit the target.
  const perList = Math.ceil(TARGET_CORPUS / 2 / 20); // pages per list (~20/page)
  for (const listName of ["top_rated", "popular"]) {
    for (let page = 1; page <= perList && ids.size < TARGET_CORPUS; page++) {
      const data = await tmdb(`/movie/${listName}?page=${page}`);
      for (const m of data?.results || []) ids.add(m.id);
    }
  }

  // Union with every film any user has on a list (always keep those vectorized).
  for (const table of ["watchlist", "watched"]) {
    let data;
    try {
      data = await dbSelect(table, "select=tmdb_id");
    } catch (e) {
      die(`Reading ${table}: ${e.message}`);
    }
    for (const r of data || []) ids.add(Number(r.tmdb_id));
  }

  return [...ids];
}

// ==========================================================================
//  2. detail fetch (genres + keywords + credits in one call)
// ==========================================================================
async function fetchAllDetails(ids) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < ids.length) {
      const id = ids[i++];
      const d = await tmdb(
        `/movie/${id}?append_to_response=keywords,credits`
      );
      if (!d || !d.id) continue;
      out.push(shapeFilm(d));
      if (out.length % 500 === 0) log(`  …${out.length} details`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}

function shapeFilm(d) {
  const genreIds = (d.genres || []).map((g) => g.id);
  const keywords = (d.keywords?.keywords || []).map((k) => ({
    id: String(k.id),
    name: k.name,
  }));
  const crew = d.credits?.crew || [];
  const cast = d.credits?.cast || [];
  const director = crew.find((c) => c.job === "Director");
  const people = [];
  if (director) people.push({ id: String(director.id), name: director.name });
  for (const c of cast.slice(0, CAST_TOP)) {
    people.push({ id: String(c.id), name: c.name });
  }
  return {
    id: d.id,
    title: d.title || d.original_title || "",
    year: (d.release_date || "").slice(0, 4),
    poster: d.poster_path || "",
    rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : 0,
    popularity: d.popularity ?? 0,
    genreIds,
    primaryGenre: firstGenreName(genreIds),
    keywords,
    people,
  };
}

// ==========================================================================
//  3. vocabulary — top keywords/people by corpus document-frequency
// ==========================================================================
function buildVocabulary(films) {
  const kwFreq = new Map(); // id -> { name, count }
  const pplFreq = new Map();
  for (const f of films) {
    for (const k of f.keywords) bump(kwFreq, k.id, k.name);
    for (const p of f.people) bump(pplFreq, p.id, p.name);
  }

  const keywordDim = assignDims(kwFreq, KEYWORD_DIM, GENRE_DIM);
  const peopleDim = assignDims(pplFreq, PEOPLE_DIM, GENRE_DIM + KEYWORD_DIM);

  const vocabRows = [];
  for (const [id, dim] of keywordDim)
    vocabRows.push({ dim, kind: "keyword", term: kwFreq.get(id).name, ref: id });
  for (const [id, dim] of peopleDim)
    vocabRows.push({ dim, kind: "person", term: pplFreq.get(id).name, ref: id });

  return { keywordDim, peopleDim, vocabRows };
}

function bump(map, id, name) {
  const cur = map.get(id);
  if (cur) cur.count++;
  else map.set(id, { name, count: 1 });
}

// Take the top `cap` entries by frequency and map id -> dim (0-based within the
// SQL vector, i.e. offset + rank). Ties broken by id for determinism.
function assignDims(freq, cap, offset) {
  const top = [...freq.entries()]
    .sort((a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : 1))
    .slice(0, cap);
  const dims = new Map();
  top.forEach(([id], rank) => dims.set(id, offset + rank));
  return dims;
}

// ==========================================================================
//  4. per-film multi-hot vector, L2-normalized
// ==========================================================================
function buildVector(f, keywordDim, peopleDim) {
  const v = new Array(TOTAL_DIM).fill(0);
  let any = false;

  for (const gid of f.genreIds) {
    const gi = GENRE_IDS.indexOf(gid);
    if (gi >= 0) {
      v[gi] = 1;
      any = true;
    }
  }
  for (const k of f.keywords) {
    const dim = keywordDim.get(k.id);
    if (dim !== undefined) {
      v[dim] = 1;
      any = true;
    }
  }
  for (const p of f.people) {
    const dim = peopleDim.get(p.id);
    if (dim !== undefined) {
      v[dim] = 1;
      any = true;
    }
  }
  if (!any) return null;

  // L2 normalize so cosine distance is well-scaled across films.
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < v.length; d++) {
    v[d] = v[d] === 0 ? 0 : Math.round((v[d] / norm) * 1e6) / 1e6;
  }
  return v;
}

// ==========================================================================
//  5. writes
// ==========================================================================
async function replaceVocab(vocabRows) {
  // Full rebuild: clear then insert. (Vectors are rewritten in the same run, so
  // dim meanings stay self-consistent.)
  try {
    await dbDelete("movie_vector_vocab", "dim=gte.0");
    for (const chunk of chunked(vocabRows, UPSERT_CHUNK)) {
      await dbInsert("movie_vector_vocab", chunk);
    }
  } catch (e) {
    die(`Writing vocab: ${e.message}`);
  }
}

async function upsertVectors(rows) {
  let done = 0;
  for (const chunk of chunked(rows, UPSERT_CHUNK)) {
    try {
      await dbUpsert("movie_vectors", chunk, "tmdb_id");
    } catch (e) {
      die(`Upserting movie_vectors: ${e.message}`);
    }
    done += chunk.length;
    log(`  …upserted ${done}/${rows.length}`);
  }
}

// ==========================================================================
//  helpers
// ==========================================================================
const GENRE_NAMES = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};
function firstGenreName(ids) {
  for (const id of ids) if (GENRE_NAMES[id]) return GENRE_NAMES[id];
  return "";
}

// TMDB fetch with basic 429 backoff.
async function tmdb(pathAndQuery, attempt = 0) {
  const sep = pathAndQuery.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE}${pathAndQuery}${sep}include_adult=false`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: "application/json" },
    });
    if (res.status === 429 && attempt < 5) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 1000 * (attempt + 1);
      await sleep(wait);
      return tmdb(pathAndQuery, attempt + 1);
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    if (attempt < 3) {
      await sleep(500 * (attempt + 1));
      return tmdb(pathAndQuery, attempt + 1);
    }
    return null;
  }
}

function* chunked(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
function die(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

// Minimal .env.local reader (KEY=VALUE lines) — only fills vars not already set.
function loadDotEnvLocal(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined && val !== "") process.env[key] = val;
  }
}

main().catch((e) => die(e?.message || String(e)));
