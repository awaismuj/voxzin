import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  ArticleDetail,
  ArticleSummary,
  HomeFeed,
  ListArticlesQuery,
  Paginated,
} from '@voxzin/shared';
import type { z } from 'zod';
import type { searchQuery } from '@voxzin/shared';
import { uploadedImageSize } from '../common/uploaded-image-size';
import { sanitizeArticleHtml } from '../common/sanitize';

interface Row {
  _id: { toString(): string };
  slug: string;
  title: string;
  subtitle?: string;
  youtubeUrl?: string | null;
  excerpt: string;
  tags?: string[];
  content: string;
  featuredImage?: { url?: string; alt?: string };
  category: { name: string; slug: string };
  author: { name: string; slug: string; designation?: string };
  sources?: { title?: string; url?: string }[];
  publishedAt: Date;
  updatedAt: Date;
  readingTime: number;
  seoTitle?: string;
  metaDescription?: string;
  socialTitle?: string;
  socialDescription?: string;
  canonicalUrl?: string;
}

const livePublished = () => ({ status: 'published', publishedAt: { $lte: new Date() } });

function toSummary(a: Row): ArticleSummary {
  const img = a.featuredImage?.url
    ? { url: a.featuredImage.url, alt: a.featuredImage.alt ?? a.title, ...uploadedImageSize(a.featuredImage.url) }
    : null;
  return {
    id: a._id.toString(),
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    image: img,
    category: { name: a.category.name, slug: a.category.slug },
    publishedAt: a.publishedAt.toISOString(),
    readingTime: a.readingTime,
  };
}

@Injectable()
export class ArticlesService {
  constructor(
    @InjectModel('Article') private readonly articles: Model<Record<string, unknown>>,
    @InjectModel('Category') private readonly categories: Model<Record<string, unknown>>,
    @InjectModel('TrendingTopic') private readonly trends: Model<Record<string, unknown>>,
  ) {}

  private find(filter: Record<string, unknown>) {
    return this.articles
      .find(filter)
      .select('-content')
      .populate('category', 'name slug')
      .populate('author', 'name slug designation');
  }

  async home(): Promise<HomeFeed> {
    const [latest, featured, breaking, trending] = await Promise.all([
      this.find(livePublished()).sort({ publishedAt: -1 }).limit(24).lean<Row[]>(),
      this.find({ ...livePublished(), isFeatured: true }).sort({ publishedAt: -1 }).limit(1).lean<Row[]>(),
      this.articles
        .find({ ...livePublished(), isBreaking: true })
        .select('slug title')
        .sort({ publishedAt: -1 })
        .limit(6)
        .lean<{ slug: string; title: string }[]>(),
      this.trends
        .find({ status: 'approved' })
        .select('title slug country description category isFeatured trendMetric lastUpdatedAt relatedArticles')
        .populate({
          path: 'relatedArticles',
          match: livePublished(),
          select: 'slug title excerpt featuredImage category author publishedAt updatedAt readingTime',
          populate: [
            { path: 'category', select: 'name slug' },
            { path: 'author', select: 'name slug designation' },
          ],
        })
        .sort({ isFeatured: -1, lastUpdatedAt: -1 })
        .limit(100)
        .lean<{
          slug: string;
          title: string;
          country: string;
          description?: string;
          category?: string;
          isFeatured: boolean;
          trendMetric?: string;
          relatedArticles?: (Row | null)[];
        }[]>(),
    ]);

    const heroRow = featured[0] ?? latest[0] ?? null;
    const rest = latest.filter((a) => a.slug !== heroRow?.slug);
    const uniqueTrending = new Map<string, (typeof trending)[number]>();
    for (const topic of trending) {
      if (!uniqueTrending.has(topic.slug)) uniqueTrending.set(topic.slug, topic);
      if (uniqueTrending.size === 8) break;
    }
    return {
      breaking: breaking.map((b) => ({ slug: b.slug, title: b.title })),
      trending: [...uniqueTrending.values()].map((t) => ({
        slug: t.slug,
        title: t.title,
        country: t.country,
        description: t.description ?? '',
        category: t.category ?? 'general',
        isFeatured: t.isFeatured,
        trendMetric: t.trendMetric ?? null,
        related: (t.relatedArticles ?? []).filter((article): article is Row => article !== null).map(toSummary),
      })),
      hero: heroRow ? toSummary(heroRow) : null,
      topStories: rest.slice(0, 4).map(toSummary),
      featured: rest.slice(4, 8).map(toSummary),
    };
  }

  async list(query: ListArticlesQuery): Promise<Paginated<ArticleSummary>> {
    const filter: Record<string, unknown> = livePublished();
    if (query.category) {
      const cat = await this.categories.findOne({ slug: query.category, isActive: true }).select('_id').lean<{ _id: unknown }>();
      if (!cat) throw new NotFoundException('Category not found');
      filter.category = cat._id;
    }
    const [rows, total] = await Promise.all([
      this.find(filter)
        .sort({ publishedAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<Row[]>(),
      this.articles.countDocuments(filter),
    ]);
    return {
      items: rows.map(toSummary),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async search(query: z.infer<typeof searchQuery>): Promise<Paginated<ArticleSummary>> {
    const filter: Record<string, unknown> = { ...livePublished(), $text: { $search: query.q } };
    if (query.category) {
      const cat = await this.categories.findOne({ slug: query.category, isActive: true }).select('_id').lean<{ _id: unknown }>();
      if (!cat) return { items: [], page: query.page, limit: query.limit, total: 0, totalPages: 1 };
      filter.category = cat._id;
    }
    const [rows, total] = await Promise.all([
      this.find(filter)
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<Row[]>(),
      this.articles.countDocuments(filter),
    ]);
    return { items: rows.map(toSummary), page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
  }

  async getBySlug(slug: string): Promise<ArticleDetail> {
    const row = await this.articles
      .findOne({ ...livePublished(), slug })
      .populate('category', 'name slug')
      .populate('author', 'name slug designation')
      .lean<Row & { category: Row['category'] & { _id: unknown } }>();
    if (!row) throw new NotFoundException('Article not found');

    const related = await this.find({ ...livePublished(), category: row.category._id, slug: { $ne: slug } })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean<Row[]>();

    return {
      ...toSummary(row),
      tags: row.tags ?? [],
      subtitle: row.subtitle ?? null,
      youtubeUrl: row.youtubeUrl ?? null,
      content: sanitizeArticleHtml(row.content),
      updatedAt: row.updatedAt.toISOString(),
      author: { name: row.author.name, slug: row.author.slug, designation: row.author.designation ?? null },
      sources: (row.sources ?? [])
        .filter((s) => s.url && /^https?:\/\//.test(s.url))
        .map((s) => ({ title: s.title || s.url!, url: s.url! })),
      related: related.map(toSummary),
      seo: {
        title: row.seoTitle || row.title,
        description: row.metaDescription || row.excerpt,
        socialTitle: row.socialTitle || row.seoTitle || row.title,
        socialDescription: row.socialDescription || row.metaDescription || row.excerpt,
        canonicalUrl: row.canonicalUrl ?? null,
      },
    };
  }
}
