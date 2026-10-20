"use client";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="card mx-auto max-w-md px-6 py-12 text-center">
      <p className="text-4xl">😕</p>
      <h2 className="mt-3 text-lg font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm text-zinc-500">
        We couldn&apos;t load data from the sheet. Check the Google Sheets configuration and try again.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-zinc-400">Ref: {error.digest}</p>}
      <button onClick={() => retry()} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
