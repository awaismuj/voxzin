import type { Metadata } from 'next';
import { ArticleList } from '@/components/article-list';
import { EmptyState } from '@/components/empty-state';
import { getSearch } from '@/lib/api';
import { parsePage } from '@/lib/page';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? '';
  const page = parsePage(sp.page);
  const data = q.length >= 2 ? await getSearch(q, page) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold">Search</h1>
      <form action="/search" role="search" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">Search VoxZin</label>
        <input id="q" name="q" defaultValue={q} minLength={2} maxLength={100} required placeholder="Search articles"
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-4 py-2.5" />
        <button type="submit" className="rounded-md bg-navy px-5 py-2.5 font-medium text-white">Search</button>
      </form>
      <div className="mt-8">
        {!data ? (
          <EmptyState title="What are you looking for?" body="Type at least two characters to search published articles." />
        ) : data.items.length === 0 ? (
          <EmptyState title={`No results for “${q}”`} body="Check the spelling or try a broader term." />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">{data.total} result{data.total === 1 ? '' : 's'}</p>
            <ArticleList data={data} basePath={`/search?q=${encodeURIComponent(q)}`} />
          </>
        )}
      </div>
    </div>
  );
}
