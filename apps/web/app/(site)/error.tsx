'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">We couldn’t load this page</h1>
      <p className="mt-3 text-muted">The news service didn’t respond. Check your connection and try again.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-md bg-navy px-5 py-2.5 font-medium text-white hover:opacity-90">
        Try again
      </button>
    </div>
  );
}
