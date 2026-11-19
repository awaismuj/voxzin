import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError, getCountries, getTrendTopic } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ country?: string }> };

async function load(slug: string, country?: string) {
  try {
    return await getTrendTopic(slug, country && /^[A-Z]{2}$/.test(country) ? country : undefined);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const t = await load((await params).slug, (await searchParams).country);
  return { title: t.title, description: t.description.slice(0, 155) || undefined, alternates: { canonical: `/trending/${t.slug}` } };
}

export default async function TopicPage({ params, searchParams }: Props) {
  const [t, countries] = await Promise.all([
    load((await params).slug, (await searchParams).country),
    getCountries(),
  ]);
  const countryName = countries.find((country) => country.code === t.country)?.name ?? t.country;
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/trending" className="text-sm font-semibold text-accent-ink hover:underline">Trending</Link>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">{t.title}</h1>
      <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-muted">
        <span>{countryName}</span><span>{t.category}</span>
        <span>First seen {formatDate(t.discoveredAt)}</span><span>Updated {formatDate(t.lastUpdatedAt)}</span>
        {t.trendMetric && <span>Source reports {t.trendMetric} searches</span>}
      </p>
      <div className="article-body mt-8"><p>{t.description}</p></div>
      {t.keywords.length > 0 && (
        <p className="mt-6 text-sm text-muted">Related keywords: {t.keywords.join(', ')}</p>
      )}
      {t.sourceUrl && (
        <p className="mt-6 text-sm">Original source ({t.source}):{' '}
          <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">{new URL(t.sourceUrl).hostname}</a>
        </p>
      )}
      {t.related.length > 0 && (
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="rel">
          <h2 id="rel" className="text-lg font-semibold">Related articles</h2>
          <ul className="mt-3 space-y-2">
            {t.related.map((a) => (
              <li key={a.slug}><Link href={`/articles/${a.slug}`} className="text-accent-ink hover:underline">{a.title}</Link></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
