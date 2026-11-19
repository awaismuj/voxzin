import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/article-card';
import { ArticleBody } from '@/components/article-body';
import { StoryFrame } from '@/components/story-frame';
import { ApiError, getArticle } from '@/lib/api';
import { absoluteUrl, SITE_NAME, SITE_URL } from '@/lib/site';
import { formatDate } from '@/lib/utils';
import { getYouTubeVideoId } from '@voxzin/shared';

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
  const url = `${SITE_URL}/articles/${a.slug}`;
  const image = a.image ? absoluteUrl(a.image.url) : undefined;
  return {
    title: a.seo.title,
    description: a.seo.description,
    authors: [{ name: a.author.name }],
    alternates: { canonical: a.seo.canonicalUrl ?? `/articles/${a.slug}` },
    openGraph: {
      type: 'article',
      url,
      siteName: SITE_NAME,
      title: a.seo.title,
      description: a.seo.description,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      authors: [a.author.name],
      section: a.category.name,
      images: image ? [{ url: image, alt: a.image?.alt }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: a.seo.title,
      description: a.seo.description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await load((await params).slug);
  const updated = formatDate(a.updatedAt) !== formatDate(a.publishedAt);

  const url = `${SITE_URL}/articles/${a.slug}`;
  const image = a.image ? absoluteUrl(a.image.url) : undefined;
  const youtubeId = a.youtubeUrl ? getYouTubeVideoId(a.youtubeUrl) : null;
  const words = a.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        '@id': `${url}#article`,
        headline: a.title.slice(0, 110),
        description: a.seo.description,
        image: image ? [image] : undefined,
        thumbnailUrl: image,
        datePublished: a.publishedAt,
        dateModified: a.updatedAt,
        author: { '@type': 'Person', name: a.author.name },
        publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        articleSection: a.category.name,
        inLanguage: 'en',
        isAccessibleForFree: true,
        wordCount: words,
        citation: a.sources.map((src) => ({ '@type': 'CreativeWork', name: src.title, url: src.url })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: a.category.name, item: `${SITE_URL}/${a.category.slug}` },
          { '@type': 'ListItem', position: 3, name: a.title, item: url },
        ],
      },
    ],
  };
  return (
    <article className="mx-auto w-full px-4 py-10 sm:px-6">
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

      <StoryFrame
        image={a.image}
        sizes="100vw"
        mode="natural"
        priority
        className="mx-auto mt-8 w-full rounded-2xl shadow-sm"
      />

      {youtubeId && (
        <section aria-label="Article video" className="mx-auto mt-8 w-full">
          <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-sm">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title={`YouTube video: ${a.title}`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="size-full"
            />
          </div>
        </section>
      )}

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
          <h2 id="related-heading" className="mb-5 section-title text-2xl font-bold tracking-tight">Related articles</h2>
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
