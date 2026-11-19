import Link from 'next/link';
import { card } from '@/components/admin/ui';
import { adminGet, requireRole } from '@/lib/admin-server';
import { SITE_URL } from '@/lib/site';

type Overview = {
  summary: {
    published: number;
    titlesMissing: number;
    titlesTooLong: number;
    descriptionsMissing: number;
    descriptionsTooLong: number;
    missingImages: number;
    missingImageAlt: number;
    needsAttention: number;
  };
  articles: { id: string; slug: string; title: string; issues: string[] }[];
};

const checks = [
  ['Titles missing', 'titlesMissing'],
  ['Titles over 70 characters', 'titlesTooLong'],
  ['Descriptions missing', 'descriptionsMissing'],
  ['Descriptions over 170 characters', 'descriptionsTooLong'],
  ['Featured images missing', 'missingImages'],
  ['Featured-image alt text missing', 'missingImageAlt'],
] as const;

export default async function SeoAdminPage() {
  await requireRole('super_admin', 'admin', 'editor');
  const { summary, articles } = await adminGet<Overview>('/admin/seo/overview');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">SEO center</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Review on-page content basics and open Google Search Console to monitor indexing and search performance.
          These checks improve readiness; rankings depend on many factors and cannot be guaranteed.
        </p>
      </header>

      <section aria-label="Published content audit" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={card}><p className="text-3xl font-semibold">{summary.published}</p><p className="mt-1 text-sm text-muted">Published articles checked</p></div>
        <div className={card}><p className="text-3xl font-semibold">{summary.needsAttention}</p><p className="mt-1 text-sm text-muted">Articles with recommendations</p></div>
        <div className={card}><p className="text-3xl font-semibold">{summary.missingImages}</p><p className="mt-1 text-sm text-muted">Without featured images</p></div>
        <div className={card}><p className="text-3xl font-semibold">{summary.missingImageAlt}</p><p className="mt-1 text-sm text-muted">Images without alt text</p></div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Site discovery and monitoring</h2>
        <p className="mt-1 text-sm text-muted">Submit your sitemap once in Search Console, then monitor indexing and queries there. Voxzin does not have access to your Search Console account.</p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <li><a className="text-accent-ink underline" href="https://search.google.com/search-console/" target="_blank" rel="noopener noreferrer">Open Google Search Console</a></li>
          <li><a className="text-accent-ink underline" href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noopener noreferrer">View XML sitemap</a></li>
          <li><a className="text-accent-ink underline" href={`${SITE_URL}/news-sitemap.xml`} target="_blank" rel="noopener noreferrer">View Google News sitemap</a></li>
          <li><a className="text-accent-ink underline" href={`${SITE_URL}/robots.txt`} target="_blank" rel="noopener noreferrer">View robots.txt</a></li>
        </ul>
        <p className="mt-4 text-xs text-muted">After submitting a sitemap or making updates, Google may take days or weeks to reflect changes. Search Console URL Inspection can request recrawling of important updated pages.</p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Published article checks</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {checks.map(([label, key]) => (
            <li key={key} className="flex items-center justify-between gap-3 border-b border-line py-2">
              <span>{label}</span><strong>{summary[key]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Articles to review</h2>
          <Link href="/admin/articles?status=published" className="text-sm font-medium text-accent-ink hover:underline">Browse published articles</Link>
        </div>
        {articles.length === 0 ? (
          <p className={card}>No recommendations for published articles.</p>
        ) : (
          <ul className="space-y-3">
            {articles.map((article) => (
              <li key={article.id} className={card}>
                <Link href={`/admin/articles/${article.id}`} className="font-semibold text-accent-ink hover:underline">{article.title}</Link>
                <p className="mt-1 text-xs text-muted">/articles/{article.slug}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {article.issues.map((issue) => <li key={issue} className="rounded-full bg-bg px-3 py-1 text-xs">{issue}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {summary.needsAttention > articles.length && <p className="mt-3 text-xs text-muted">Showing the 50 most recently published articles needing attention.</p>}
      </section>
    </div>
  );
}
