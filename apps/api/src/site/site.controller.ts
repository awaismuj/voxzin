import { Controller, Get, Header } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { M } from '../common/types';

@Controller()
export class SiteController {
  constructor(
    @InjectModel('SiteSettings') private readonly settings: M,
    @InjectModel('Article') private readonly articles: M,
    @InjectModel('Category') private readonly categories: M,
  ) {}

  @Get('settings')
  @Header('Cache-Control', 'public, s-maxage=300')
  async publicSettings() {
    const s = await this.settings.findOne({ key: 'main' }).select('brandName tagline contactEmail social').lean();
    return s ?? { brandName: 'VoxZin', tagline: "The voice of today's trending stories.", contactEmail: '', social: {} };
  }

  @Get('sitemap')
  @Header('Cache-Control', 'no-store')
  async sitemap() {
    const filter = { status: 'published', publishedAt: { $lte: new Date() } };
    const [rows, activeCategories, articleCount] = await Promise.all([
      this.articles
        .find(filter)
        .select('slug updatedAt')
        .sort({ publishedAt: -1 })
        .limit(50_000)
        .lean<{ slug: string; updatedAt: Date }[]>(),
      this.categories.find({ isActive: true }).select('_id slug').lean<{ _id: unknown; slug: string }[]>(),
      this.articles.countDocuments(filter),
    ]);
    const counts = activeCategories.length
      ? await this.articles.aggregate<{ _id: unknown; count: number }>([
          { $match: { ...filter, category: { $in: activeCategories.map((c) => c._id) } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ])
      : [];
    const byCategory = new Map(counts.map((c) => [String(c._id), c.count]));
    return {
      articles: rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() })),
      categories: activeCategories.map((c) => ({
        slug: c.slug,
        pages: Math.min(1000, Math.max(1, Math.ceil((byCategory.get(String(c._id)) ?? 0) / 12))),
      })),
      latestPages: Math.min(1000, Math.max(1, Math.ceil(articleCount / 12))),
    };
  }
}
