import { Controller, Get, Header } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { M } from '../common/types';

@Controller()
export class SiteController {
  constructor(
    @InjectModel('SiteSettings') private readonly settings: M,
    @InjectModel('Article') private readonly articles: M,
    @InjectModel('Category') private readonly categories: M,
    @InjectModel('TrendingTopic') private readonly trendingTopics: M,
  ) {}

  @Get('settings')
  @Header('Cache-Control', 'public, s-maxage=300')
  async publicSettings() {
    const s = await this.settings.findOne({ key: 'main' }).select('brandName tagline contactEmail social').lean();
    return s ?? { brandName: 'VoxZin', tagline: "The Voice of What's Trending.", contactEmail: '', social: {} };
  }

  @Get('sitemap')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  async sitemap() {
    const filter = { status: 'published', publishedAt: { $lte: new Date() } };
    const [rows, activeCategories, articleCount, topics] = await Promise.all([
      this.articles
        .find(filter)
        .select('slug updatedAt canonicalUrl featuredImage.url')
        .sort({ publishedAt: -1 })
        .limit(50_000)
        .lean<{ slug: string; updatedAt: Date; canonicalUrl?: string; featuredImage?: { url?: string } }[]>(),
      this.categories.find({ isActive: true }).select('_id slug').lean<{ _id: unknown; slug: string }[]>(),
      this.articles.countDocuments(filter),
      this.trendingTopics
        .find({ status: 'approved' })
        .select('slug lastUpdatedAt')
        .sort({ lastUpdatedAt: -1 })
        .limit(50_000)
        .lean<{ slug: string; lastUpdatedAt: Date }[]>(),
    ]);
    const counts = activeCategories.length
      ? await this.articles.aggregate<{ _id: unknown; count: number }>([
          { $match: { ...filter, category: { $in: activeCategories.map((c) => c._id) } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ])
      : [];
    const byCategory = new Map(counts.map((c) => [String(c._id), c.count]));
    const topicsBySlug = new Map<string, { slug: string; updatedAt: string }>();
    for (const topic of topics) {
      if (!topicsBySlug.has(topic.slug)) {
        topicsBySlug.set(topic.slug, { slug: topic.slug, updatedAt: topic.lastUpdatedAt.toISOString() });
      }
    }
    return {
      articles: rows.map((r) => ({
        slug: r.slug,
        updatedAt: r.updatedAt.toISOString(),
        canonicalUrl: r.canonicalUrl ?? null,
        imageUrl: r.featuredImage?.url ?? null,
      })),
      trendingTopics: [...topicsBySlug.values()],
      categories: activeCategories.map((c) => ({
        slug: c.slug,
        pages: Math.min(1000, Math.max(1, Math.ceil((byCategory.get(String(c._id)) ?? 0) / 12))),
      })),
      latestPages: Math.min(1000, Math.max(1, Math.ceil(articleCount / 12))),
    };
  }
}
