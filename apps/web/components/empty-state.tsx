export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
    </div>
  );
}
