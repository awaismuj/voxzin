export default function Loading() {
  return (
    <div className="mx-auto w-full px-4 py-10 sm:px-6" role="status" aria-label="Loading">
      <div className="h-[26rem] animate-pulse rounded-xl bg-line" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-lg bg-line" />
        ))}
      </div>
    </div>
  );
}
