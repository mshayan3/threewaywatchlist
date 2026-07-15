"use client";

import { useEffect, useRef, useState } from "react";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

// Small themed dropdown used for list sorting on the dashboard and in groups.
// Replaces the segmented toggle so the option set can grow without crowding.
export default function SortMenu<T extends string>({
  value,
  onChange,
  options,
  label = "Sort",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SortOption<T>[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 rounded-[12px] border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-text transition-colors hover:border-accent"
      >
        <span className="font-semibold text-dim">{label}:</span>
        {current?.label ?? ""}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={"transition-transform " + (open ? "rotate-180" : "")}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+6px)] z-30 flex min-w-[160px] flex-col rounded-[var(--radius-sm)] border border-border bg-surface p-1.5"
          style={{ boxShadow: "var(--card-shadow-hover)" }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[.88rem] font-semibold transition-colors " +
                (o.value === value ? "bg-chip text-text" : "text-dim hover:bg-chip hover:text-text")
              }
            >
              {o.label}
              {o.value === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
