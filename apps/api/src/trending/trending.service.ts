import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DEFAULT_TREND_COUNTRIES, type TrendTopicDto } from '@voxzin/shared';
import { AuditService } from '../auth/audit.service';
import type { AuthUser, M } from '../common/types';

interface Row {
  _id: { toString(): string };
  title: string; slug: string; description?: string; category: string; country: string; source: string;
  sourceUrl?: string; trendMetric?: string; discoveredAt: Date; lastUpdatedAt: Date; isFeatured: boolean;
  keywords?: string[]; relatedArticles?: { slug: string; title: string }[]; status?: string; verificationStatus?: string;
}

const toDto = (t: Row): TrendTopicDto => ({
  id: t._id.toString(), title: t.title, slug: t.slug, description: t.description ?? '', category: t.category,
  country: t.country, source: t.source, sourceUrl: t.sourceUrl ?? null, trendMetric: t.trendMetric ?? null,
  discoveredAt: t.discoveredAt.toISOString(), lastUpdatedAt: t.lastUpdatedAt.toISOString(), isFeatured: t.isFeatured,
  keywords: t.keywords ?? [], related: (t.relatedArticles ?? []).map((a) => ({ slug: a.slug, title: a.title })),
});

@Injectable()
export class TrendingService implements OnModuleInit {
  constructor(
    @InjectModel('TrendingTopic') private readonly trends: M,
    @InjectModel('Country') private readonly countries: M,
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
      .populate({ path: 'relatedArticles', match: { status: 'published' }, select: 'slug title' })
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
      .populate({ path: 'relatedArticles', match: { status: 'published' }, select: 'slug title' })
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
      this.trends.find(filter).sort({ lastUpdatedAt: -1 }).skip((q.page - 1) * limit).limit(limit).lean<Row[]>(),
      this.trends.countDocuments(filter),
    ]);
    return {
      items: rows.map((r) => ({ ...toDto(r), status: r.status, verificationStatus: r.verificationStatus })),
      page: q.page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async patch(actor: AuthUser, id: string, input: Record<string, unknown>, ip?: string) {
    const { relatedArticleIds, ...rest } = input;
    const set: Record<string, unknown> = { ...rest };
    if (relatedArticleIds) set.relatedArticles = relatedArticleIds;
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
