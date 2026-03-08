export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-stone-700 dark:border-white/15 dark:border-t-white" />
      <span className="text-sm text-stone-400 dark:text-slate-600 font-medium">
        Calculating…
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
