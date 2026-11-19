import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { getCountries, getTrending } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'Trending', description: 'Topics people are searching for and discussing, collected from original sources.', alternates: { canonical: '/trending' } };
export const dynamic = 'force-dynamic';

export default async function TrendingPage() {
  const [topics, countries] = await Promise.all([getTrending('WW'), getCountries()]);

  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl font-semibold">Trending</h1>
      <p className="mt-2 max-w-2xl text-muted">Topics are automatically published across all regions. Any figures shown are reported by the original source; we don’t estimate them.</p>

      <div className="mt-8">
        {topics.length === 0 ? (
          <EmptyState title="No trending topics yet" body="New topics will appear here automatically when they are found by our sources." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {topics.map((t) => (
              <li key={t.id} className="rounded-lg border border-line bg-surface p-5">
                <Link href={`/trending/${t.slug}?country=${t.country}`} className="font-serif text-xl font-semibold hover:underline">{t.title}</Link>
                {t.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{t.description}</p>}
                <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-muted">
                  <span>{t.category}</span>
                  <span>Reported in {countries.find((country) => country.code === t.country)?.name ?? t.country}</span>
                  {t.trendMetric && <span>Source reports {t.trendMetric} searches</span>}
                  <span>Updated {timeAgo(t.lastUpdatedAt)}</span>
                  <span>Source: {t.source}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
