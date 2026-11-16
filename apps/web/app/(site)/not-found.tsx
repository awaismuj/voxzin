import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">This page doesn’t exist or has moved.</p>
      <Link href="/latest" className="mt-6 inline-block rounded-md bg-navy px-5 py-2.5 font-medium text-white hover:opacity-90">
        Read the latest stories
      </Link>
    </div>
  );
}
