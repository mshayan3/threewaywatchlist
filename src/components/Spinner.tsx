export default function Spinner() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-dim">
      <span
        className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent"
        aria-label="Loading"
      />
    </div>
  );
}
