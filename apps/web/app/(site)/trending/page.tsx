import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { getCountries, getTrending } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'Trending', description: 'What people are searching for and discussing, reviewed by our editors.', alternates: { canonical: '/trending' } };
export const dynamic = 'force-dynamic';

export default async function TrendingPage({ searchParams }: { searchParams: Promise<{ country?: string | string[] }> }) {
  const raw = (await searchParams).country;
  const c = Array.isArray(raw) ? raw[0] : raw;
  const countries = await getCountries();
  const country = countries.some((item) => item.code === c) ? c! : countries[0]?.code ?? 'WW';
  const topics = await getTrending(country);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold">Trending</h1>
      <p className="mt-2 max-w-2xl text-muted">Topics our editors have reviewed and approved. Figures shown come from the original source; we don’t estimate them.</p>

      <nav aria-label="Country" className="mt-6 flex flex-wrap gap-2">
        {countries.map(({ code, name }) => (
          <Link key={code} href={code === 'WW' ? '/trending' : `/trending?country=${code}`}
            aria-current={code === country ? 'page' : undefined}
            className={cn('rounded-full border px-4 py-1.5 text-sm', code === country ? 'border-navy bg-navy text-white' : 'border-line bg-surface hover:border-accent')}>
            {name}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {topics.length === 0 ? (
          <EmptyState title="No approved topics for this region yet" body="Editors review new topics before they appear here. Try another region or check back soon." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {topics.map((t) => (
              <li key={t.id} className="rounded-lg border border-line bg-surface p-5">
                <Link href={`/trending/${t.slug}?country=${t.country}`} className="font-serif text-xl font-semibold hover:underline">{t.title}</Link>
                {t.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{t.description}</p>}
                <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-muted">
                  <span>{t.category}</span>
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
