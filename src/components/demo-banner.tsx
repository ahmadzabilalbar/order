export function DemoBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span aria-hidden>⚠️</span>
      <p>
        <strong className="font-semibold">Demo mode.</strong> Google Sheets isn&apos;t connected, so data is kept
        in memory and resets on restart. Set the <code className="font-mono text-xs">GOOGLE_*</code> environment
        variables to go live.
      </p>
    </div>
  );
}
