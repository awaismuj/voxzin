import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/article-card';
import { CategoryBar } from '@/components/category-bar';
import { EmptyState } from '@/components/empty-state';
import { Hero } from '@/components/hero';
import { Ticker } from '@/components/ticker';
import { getHome, getHomepageFeedback } from '@/lib/api';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [feed, communityFeedback] = await Promise.all([getHome(), getHomepageFeedback()]);

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
            <h2 id="trending-stories-heading" className="section-title text-2xl font-bold tracking-tight">Latest stories</h2>
            <Link href="/latest" className="text-sm font-medium text-accent-ink hover:underline">All latest</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {feed.topStories.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
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
      {communityFeedback.items.length > 0 && (
        <section aria-labelledby="reader-feedback-heading" className="mx-auto mt-12 max-w-7xl px-4 pb-12 sm:px-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">From our readers</p>
              <h2 id="reader-feedback-heading" className="section-title mt-1 text-2xl font-bold tracking-tight">The conversation</h2>
            </div>
          </div>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communityFeedback.items.slice(0, 3).map((feedback) => (
              <li key={feedback.id} className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm">
                <blockquote className="line-clamp-5 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  “{feedback.message}”
                </blockquote>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-sm font-semibold">{feedback.name}</p>
                  <Link href={`/articles/${feedback.article.slug}`} className="mt-1 block line-clamp-2 text-xs text-accent-ink hover:underline">
                    On: {feedback.article.title}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
