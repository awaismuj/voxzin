import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/article-list';
import { getArticles } from '@/lib/api';

export const revalidate = 300;

type Props = { params: Promise<{ page: string }> };

function parsePageParam(raw: string) {
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 2 || page > 1000) notFound();
  return page;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parsePageParam((await params).page);
  return {
    title: `Latest - Page ${page}`,
    alternates: { canonical: `/latest/page/${page}` },
  };
}

export default async function LatestPage({ params }: Props) {
  const page = parsePageParam((await params).page);
  const data = await getArticles({ page });
  return (
    <div className="mx-auto w-full px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold">Latest - Page {page}</h1>
      <p className="mt-2 text-muted">Every new story, newest first.</p>
      <div className="mt-8"><ArticleList data={data} basePath="/latest" /></div>
    </div>
  );
}
