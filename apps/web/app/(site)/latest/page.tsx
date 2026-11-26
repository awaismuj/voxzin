import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/article-list';
import { getArticles } from '@/lib/api';
import { parsePage } from '@/lib/page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  return {
    title: page > 1 ? `Latest - Page ${page}` : 'Latest',
    alternates: { canonical: page > 1 ? `/latest/page/${page}` : '/latest' },
  };
}

export default async function LatestPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = parsePage((await searchParams).page);
  const data = await getArticles({ page });
  if (page > data.totalPages) notFound();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold">Latest</h1>
      <p className="mt-2 text-muted">Every new story, newest first.</p>
      <div className="mt-8"><ArticleList data={data} basePath="/latest" /></div>
    </div>
  );
}
