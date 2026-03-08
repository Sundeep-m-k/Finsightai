export function Loader() {
  return (
    <div className="flex items-center justify-center py-12" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
