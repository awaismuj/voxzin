import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/article-card';
import { CategoryBar } from '@/components/category-bar';
import { EmptyState } from '@/components/empty-state';
import { Hero } from '@/components/hero';
import { Ticker } from '@/components/ticker';
import { getHome } from '@/lib/api';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const feed = await getHome();

  if (!feed.hero) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h1 className="mb-4 font-serif text-4xl font-semibold">VoxZin news and insights</h1>
        <EmptyState
          title="No stories published yet"
          body="The homepage fills in as soon as the first article is published. Add one from the admin dashboard or run the development sample seed."
        />
      </div>
    );
  }

  return (
    <>
      <Ticker items={feed.breaking} />
      <Hero lead={feed.hero} />
      <CategoryBar />
      {feed.topStories.length > 0 && (
        <section aria-labelledby="trending-stories-heading" className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="trending-stories-heading" className="section-title text-2xl font-bold tracking-tight">Trending stories</h2>
            <Link href="/latest" className="text-sm font-medium text-accent-ink hover:underline">All latest</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {feed.topStories.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        </section>
      )}
      {feed.trending.length > 0 && (
        <section aria-labelledby="trending-topics-heading" className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="trending-topics-heading" className="section-title text-2xl font-bold tracking-tight">Trending topics</h2>
            <Link href="/trending" className="text-sm font-medium text-accent-ink hover:underline">All topics</Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {feed.trending.map((t) => (
              <li key={`${t.slug}-${t.country}`}>
                <Link href={`/trending/${t.slug}?country=${t.country}`} className="block rounded-full border border-line bg-surface px-4 py-1.5 text-sm hover:border-accent">
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {feed.featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="featured-heading" className="section-title text-2xl font-bold tracking-tight">Featured articles</h2>
            <Link href="/latest" className="text-sm font-medium text-accent-ink hover:underline">View all</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {feed.featured.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
