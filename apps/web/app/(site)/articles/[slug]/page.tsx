import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/article-card';
import { ArticleBody } from '@/components/article-body';
import { StoryImage } from '@/components/story-image';
import { ApiError, getArticle } from '@/lib/api';
import { SITE_URL } from '@/lib/site';
import { formatDate } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 60;

async function load(slug: string) {
  try {
    return await getArticle(slug);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).slug);
  return {
    title: a.seo.title,
    description: a.seo.description,
    alternates: { canonical: a.seo.canonicalUrl ?? `/articles/${a.slug}` },
    openGraph: {
      type: 'article',
      title: a.seo.title,
      description: a.seo.description,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      images: a.image ? [{ url: a.image.url, alt: a.image.alt }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await load((await params).slug);
  const updated = formatDate(a.updatedAt) !== formatDate(a.publishedAt);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: a.title,
        description: a.seo.description,
        image: a.image ? [a.image.url] : undefined,
        datePublished: a.publishedAt,
        dateModified: a.updatedAt,
        author: { '@type': 'Person', name: a.author.name },
        publisher: { '@type': 'Organization', name: 'Voxzin', url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/articles/${a.slug}`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: a.category.name, item: `${SITE_URL}/${a.category.slug}` },
          { '@type': 'ListItem', position: 3, name: a.title, item: `${SITE_URL}/articles/${a.slug}` },
        ],
      },
    ],
  };
  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <header className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm">
          <ol className="flex flex-wrap items-center gap-2 text-muted">
            <li><Link href="/" className="hover:text-accent-ink hover:underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href={`/${a.category.slug}`} className="font-semibold text-accent-ink hover:underline">{a.category.name}</Link></li>
          </ol>
        </nav>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{a.title}</h1>
        {a.subtitle && a.subtitle.trim().toLowerCase() !== a.title.trim().toLowerCase() && (
          <p className="mt-4 text-lg leading-relaxed text-muted sm:text-xl">{a.subtitle}</p>
        )}
        <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-line py-3 text-sm text-muted">
          <span className="font-semibold text-ink">By {a.author.name}</span>
          <time dateTime={a.publishedAt}>Published {formatDate(a.publishedAt)}</time>
          {updated && <time dateTime={a.updatedAt}>Updated {formatDate(a.updatedAt)}</time>}
          <span>{a.readingTime} min read</span>
        </p>
      </header>

      <div className="relative mx-auto mt-8 aspect-video max-w-4xl overflow-hidden rounded-2xl bg-navy shadow-sm">
        <StoryImage image={a.image} sizes="(min-width: 896px) 896px, 100vw" priority fit="contain" />
      </div>

      <div className="mx-auto mt-10 max-w-3xl">
        <ArticleBody html={a.content} />

        {a.sources.length > 0 && (
          <section aria-labelledby="sources-heading" className="mt-12 border-t border-line pt-6">
            <h2 id="sources-heading" className="text-lg font-semibold">Sources</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              {a.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {a.related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="mb-5 border-l-4 border-accent pl-3 text-2xl font-bold tracking-tight">Related articles</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {a.related.map((r) => (
              <ArticleCard key={r.id} article={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
