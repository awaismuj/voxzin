import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DEFAULT_TREND_COUNTRIES, type TrendPatchInput, type TrendTopicDto } from '@voxzin/shared';
import { AuditService } from '../auth/audit.service';
import type { AuthUser, M } from '../common/types';

interface Row {
  _id: { toString(): string };
  title: string; slug: string; description?: string; category: string; country: string; source: string;
  sourceUrl?: string; trendMetric?: string; discoveredAt: Date; lastUpdatedAt: Date; isFeatured: boolean;
  keywords?: string[];
  relatedArticles?: ({ _id: { toString(): string }; slug: string; title: string; status?: string } | null)[];
  status?: string; verificationStatus?: string;
}

const toDto = (t: Row): TrendTopicDto => ({
  id: t._id.toString(), title: t.title, slug: t.slug, description: t.description ?? '', category: t.category,
  country: t.country, source: t.source, sourceUrl: t.sourceUrl ?? null, trendMetric: t.trendMetric ?? null,
  discoveredAt: t.discoveredAt.toISOString(), lastUpdatedAt: t.lastUpdatedAt.toISOString(), isFeatured: t.isFeatured,
  keywords: t.keywords ?? [],
  related: (t.relatedArticles ?? []).filter((a): a is NonNullable<typeof a> => a !== null).map((a) => ({ slug: a.slug, title: a.title })),
});

const livePublished = () => ({ status: 'published', publishedAt: { $lte: new Date() } });

@Injectable()
export class TrendingService implements OnModuleInit {
  constructor(
    @InjectModel('TrendingTopic') private readonly trends: M,
    @InjectModel('Country') private readonly countries: M,
    @InjectModel('Article') private readonly articles: M,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await Promise.all(DEFAULT_TREND_COUNTRIES.map((country) =>
      this.countries.updateOne({ code: country.code }, { $setOnInsert: country }, { upsert: true }),
    ));
    await this.trends.updateMany({ status: 'pending' }, { $set: { status: 'approved' } });
  }

  listCountries() {
    return this.countries.find({ isActive: true }).select('code name order').sort({ order: 1, name: 1 }).lean();
  }

  // Public topics are shared across regions and automatically approved on discovery.
  async list(q: { country: string; category?: string; limit: number }) {
    if (!(await this.countries.exists({ code: q.country, isActive: true }))) return [];
    const filter: Record<string, unknown> = { status: 'approved' };
    if (q.category) filter.category = q.category;
    const rows = await this.trends
      .find(filter)
      .populate({ path: 'relatedArticles', match: livePublished(), select: 'slug title' })
      .sort({ isFeatured: -1, lastUpdatedAt: -1 })
      .limit(1000)
      .lean<Row[]>();
    const unique = new Map<string, TrendTopicDto>();
    for (const row of rows) {
      if (!unique.has(row.slug)) unique.set(row.slug, toDto(row));
      if (unique.size >= q.limit) break;
    }
    return [...unique.values()];
  }

  async getBySlug(slug: string, country?: string) {
    const activeCountryCodes = (await this.countries.find({ isActive: true }).select('code').lean<{ code: string }[]>())
      .map((item) => item.code);
    if (country && !activeCountryCodes.includes(country)) throw new NotFoundException('Topic not found');
    const row = await this.trends
      .findOne({ slug, status: 'approved', country: { $in: activeCountryCodes } })
      .populate({ path: 'relatedArticles', match: livePublished(), select: 'slug title' })
      .sort({ lastUpdatedAt: -1 })
      .lean<Row>();
    if (!row) throw new NotFoundException('Topic not found');
    return toDto(row);
  }

  // ---- admin
  async adminList(q: { status?: string; country?: string; page: number }) {
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.country) filter.country = q.country;
    const limit = 30;
    const [rows, total] = await Promise.all([
      this.trends
        .find(filter)
        .populate({ path: 'relatedArticles', select: '_id slug title status' })
        .sort({ lastUpdatedAt: -1 })
        .skip((q.page - 1) * limit)
        .limit(limit)
        .lean<Row[]>(),
      this.trends.countDocuments(filter),
    ]);
    return {
      items: rows.map((r) => ({
        ...toDto(r),
        status: r.status,
        verificationStatus: r.verificationStatus,
        linkedArticles: (r.relatedArticles ?? [])
          .filter((article): article is NonNullable<typeof article> => article !== null)
          .map(({ _id, slug, title, status }) => ({ id: _id.toString(), slug, title, status })),
      })),
      page: q.page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async patch(actor: AuthUser, id: string, input: TrendPatchInput, ip?: string) {
    const { relatedArticleIds, ...rest } = input;
    const set: Record<string, unknown> = { ...rest };
    if (relatedArticleIds !== undefined) {
      const uniqueIds = [...new Set(relatedArticleIds)];
      const articles = await this.articles
        .find({ _id: { $in: uniqueIds }, status: 'published', publishedAt: { $lte: new Date() } })
        .select('_id')
        .lean<{ _id: { toString(): string } }[]>();
      if (articles.length !== uniqueIds.length) {
        throw new BadRequestException('Related articles must be published Voxzin articles');
      }
      set.relatedArticles = uniqueIds;
    }
    if (set.status === 'approved' && set.verificationStatus === undefined) {
      const cur = await this.trends.findById(id).select('verificationStatus description').lean<{ verificationStatus?: string; description?: string }>();
      if (!cur) throw new NotFoundException();
      if (!(set.description ?? cur.description)) throw new BadRequestException('Add a researched description before approving a topic');
    }
    const res = await this.trends.updateOne({ _id: id }, { $set: set });
    if (res.matchedCount === 0) throw new NotFoundException();
    await this.audit.log(actor._id.toString(), 'trend.update', { type: 'trend', id }, { fields: Object.keys(input) }, ip);
  }
}
