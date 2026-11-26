import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { getSitemapData } from '@/lib/api';
import { absoluteUrl, isCanonicalArticle, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const getCachedSitemapData = unstable_cache(getSitemapData, ['sitemap-data'], { revalidate: 300 });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, categories, latestPages, trendingTopics } = await getCachedSitemapData();
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/latest`, changeFrequency: 'hourly' },
    { url: `${SITE_URL}/trending`, changeFrequency: 'hourly' },
    ...Array.from({ length: Math.max(0, latestPages - 1) }, (_, index) => ({
      url: `${SITE_URL}/latest/page/${index + 2}`,
      changeFrequency: 'hourly' as const,
    })),
    ...categories.flatMap((category) => [
      { url: `${SITE_URL}/${category.slug}`, changeFrequency: 'daily' as const },
      ...Array.from({ length: Math.max(0, category.pages - 1) }, (_, index) => ({
        url: `${SITE_URL}/${category.slug}/page/${index + 2}`,
        changeFrequency: 'daily' as const,
      })),
    ]),
    ...trendingTopics.map((topic) => ({
      url: `${SITE_URL}/trending/${topic.slug}`,
      lastModified: new Date(topic.updatedAt),
    })),
    ...articles
      .filter(isCanonicalArticle)
      .map((a) => ({
        url: `${SITE_URL}/articles/${a.slug}`,
        lastModified: new Date(a.updatedAt),
        images: a.imageUrl ? [absoluteUrl(a.imageUrl)] : undefined,
      })),
  ];
}
