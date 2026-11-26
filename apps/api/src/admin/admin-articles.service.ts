import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AUTHOR_EDITABLE, canTransition, slugify,
  type ArticleInput, type ArticlePatchInput, type ArticleStatus,
} from '@voxzin/shared';
import { AuditService } from '../auth/audit.service';
import { sanitizeArticleHtml } from '../common/sanitize';
import { IndexNowService } from '../seo/indexnow.service';
import { escapeRegex, type AuthUser, type M } from '../common/types';

interface Row {
  _id: { toString(): string };
  title: string;
  slug: string;
  status: ArticleStatus;
  publishedAt?: Date;
  sources?: unknown[];
  category?: { name: string };
  author?: { name: string };
  [k: string]: unknown;
}

const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ');
const readingTime = (html: string) => Math.max(1, Math.ceil(plainText(html).split(/\s+/).filter(Boolean).length / 200));
const words = (t: string) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
const TREND_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const TAG_STOP_WORDS = new Set([
  'about', 'after', 'and', 'are', 'but', 'for', 'from', 'have', 'how', 'into', 'its', 'latest',
  'live', 'news', 'new', 'not', 'that', 'the', 'their', 'this', 'was', 'were', 'what', 'when',
  'where', 'with', 'you',
]);

interface TrendTagTopic {
  title: string;
  keywords?: string[];
  lastUpdatedAt: Date | string;
  isFeatured?: boolean;
  trendMetric?: string | null;
}

interface TrendTagSuggestion {
  tag: string;
  topic: string;
  updatedAt: string;
  trendMetric: string | null;
}

const tagTerms = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((term) => term.length >= 2 && !TAG_STOP_WORDS.has(term));

export function rankTrendingTags(text: string, topics: readonly TrendTagTopic[], now = Date.now()): TrendTagSuggestion[] {
  const articleTerms = tagTerms(text);
  const articleTermSet = new Set(articleTerms);
  const normalizedText = ` ${articleTerms.join(' ')} `;
  const suggestions = new Map<string, TrendTagSuggestion & { score: number }>();

  for (const topic of topics) {
    const updatedAtMs = new Date(topic.lastUpdatedAt).getTime();
    if (!Number.isFinite(updatedAtMs) || now - updatedAtMs > TREND_WINDOW_MS) continue;
    const updatedAt = new Date(updatedAtMs).toISOString();
    const freshness = Math.max(0, 1 - Math.max(0, now - updatedAtMs) / TREND_WINDOW_MS);

    for (const candidate of [topic.title, ...(topic.keywords ?? [])]) {
      const tag = candidate.trim().replace(/\s+/g, ' ');
      const terms = tagTerms(tag);
      if (!tag || tag.length > 50 || terms.length === 0) continue;

      const phrase = terms.join(' ');
      const exactMatch = normalizedText.includes(` ${phrase} `);
      const overlap = terms.filter((term) => articleTermSet.has(term)).length / terms.length;
      if (!exactMatch && overlap < 0.6) continue;

      const key = phrase;
      const score = (exactMatch ? 10 : 4 + overlap) + freshness * 0.5 + (topic.isFeatured ? 0.25 : 0) + (topic.trendMetric ? 0.1 : 0);
      const current = suggestions.get(key);
      if (!current || score > current.score) {
        suggestions.set(key, {
          tag,
          topic: topic.title,
          updatedAt,
          trendMetric: topic.trendMetric ?? null,
          score,
        });
      }
    }
  }

  return [...suggestions.values()]
    .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt) || a.tag.localeCompare(b.tag))
    .slice(0, 10)
    .map(({ tag, topic, updatedAt, trendMetric }) => ({ tag, topic, updatedAt, trendMetric }));
}

@Injectable()
export class AdminArticlesService {
  constructor(
    @InjectModel('Article') private readonly articles: M,
    @InjectModel('Category') private readonly categories: M,
    @InjectModel('Author') private readonly authors: M,
    @InjectModel('TrendingTopic') private readonly trends: M,
    private readonly audit: AuditService,
    private readonly indexNow: IndexNowService,
  ) {}

  private scope(user: AuthUser) {
    return user.role === 'author' ? { createdBy: user._id } : {};
  }

  private async owned(user: AuthUser, id: string) {
    const row = await this.articles.findOne({ _id: id, ...this.scope(user) }).lean<Row>();
    if (!row) throw new NotFoundException('Article not found');
    return row;
  }

  private async uniqueSlug(title: string) {
    const base = slugify(title);
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? base : `${base}-${i + 1}`;
      if (!(await this.articles.exists({ slug }))) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private fields(input: ArticlePatchInput, user: AuthUser) {
    const f: Record<string, unknown> = {};
    const { categoryId, authorId, content, ...rest } = input;
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) f[k] = v;
    if (categoryId) f.category = categoryId;
    if (authorId) f.author = authorId;
    if (content !== undefined) {
      f.content = sanitizeArticleHtml(content);
      f.readingTime = readingTime(content);
    }
    if (user.role === 'author') {
      delete f.isFeatured; // placement is an editorial decision
      delete f.isBreaking;
    }
    return f;
  }

  async list(user: AuthUser, q: { status?: ArticleStatus; q?: string; page: number; limit: number }) {
    const filter: Record<string, unknown> = { ...this.scope(user) };
    if (q.status) filter.status = q.status;
    if (q.q) filter.title = { $regex: escapeRegex(q.q), $options: 'i' };
    const [rows, total] = await Promise.all([
      this.articles
        .find(filter)
        .select('title slug status publishedAt scheduledAt updatedAt isFeatured isBreaking category author')
        .populate('category', 'name')
        .populate('author', 'name')
        .sort({ updatedAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean<Row[]>(),
      this.articles.countDocuments(filter),
    ]);
    return {
      items: rows.map((r) => ({ ...r, id: r._id.toString(), category: r.category?.name ?? '', author: r.author?.name ?? '' })),
      page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  }

  async get(user: AuthUser, id: string) {
    const row = await this.owned(user, id);
    return { ...row, id: row._id.toString() };
  }

  async suggestTags(text: string) {
    const cutoff = new Date(Date.now() - TREND_WINDOW_MS);
    const topics = await this.trends
      .find({ status: 'approved', lastUpdatedAt: { $gte: cutoff } })
      .select('title keywords lastUpdatedAt isFeatured trendMetric')
      .sort({ isFeatured: -1, lastUpdatedAt: -1 })
      .limit(300)
      .lean<TrendTagTopic[]>();
    return { items: rankTrendingTags(text, topics) };
  }

  private async findDuplicates(title: string, excludeId?: string) {
    const mine = words(title);
    if (mine.size < 2) return [];
    const recent = await this.articles
      .find({ status: { $ne: 'archived' } })
      .select('title slug')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean<{ _id: { toString(): string }; title: string; slug: string }[]>();
    return recent
      .filter((r) => r._id.toString() !== excludeId)
      .filter((r) => {
        const theirs = words(r.title);
        const inter = [...mine].filter((w) => theirs.has(w)).length;
        return inter / (mine.size + theirs.size - inter) >= 0.6;
      })
      .slice(0, 5)
      .map((r) => ({ id: r._id.toString(), title: r.title, slug: r.slug }));
  }

  async create(user: AuthUser, input: ArticleInput, ip?: string) {
    const systemAuthor = user.role === 'author'
      ? undefined
      : await this.authors.findOne({ slug: 'voxzin' }).select('_id').lean<{ _id: { toString(): string } }>();
    const authorId = input.authorId ?? (user.role === 'author' ? user.authorId?.toString() : systemAuthor?._id.toString());
    if (!authorId) throw new BadRequestException('Choose an author for this article');
    if (user.role === 'author' && authorId !== user.authorId?.toString()) throw new ForbiddenException('Authors can only publish under their own profile');
    if (!(await this.categories.exists({ _id: input.categoryId, isActive: true }))) throw new BadRequestException('Choose an active category');

    const slug = await this.uniqueSlug(input.title);
    const doc = await this.articles.create({
      ...this.fields({ ...input, authorId }, user),
      slug, status: 'draft', createdBy: user._id, updatedBy: user._id,
    });
    const id = doc._id.toString();
    await this.audit.log(user._id.toString(), 'article.create', { type: 'article', id }, { aiAssisted: input.aiAssisted }, ip);
    return { id, slug, warnings: await this.findDuplicates(input.title, id) };
  }

  async update(user: AuthUser, id: string, input: ArticlePatchInput, ip?: string) {
    const row = await this.owned(user, id);
    if (user.role === 'author' && !AUTHOR_EDITABLE.includes(row.status)) throw new ForbiddenException('This article is locked while it is in review');
    if (input.categoryId && !(await this.categories.exists({ _id: input.categoryId, isActive: true }))) throw new BadRequestException('Choose an active category');
    if (input.authorId && user.role === 'author' && input.authorId !== user.authorId?.toString()) throw new ForbiddenException();
    await this.articles.updateOne({ _id: id }, { $set: { ...this.fields(input, user), updatedBy: user._id } });
    await this.audit.log(user._id.toString(), 'article.update', { type: 'article', id }, { fields: Object.keys(input) }, ip);
    if (row.status === 'published') this.indexNow.notify(`/articles/${row.slug}`);
    return { id, warnings: input.title ? await this.findDuplicates(input.title, id) : [] };
  }

  async transition(user: AuthUser, id: string, to: ArticleStatus, scheduledAt: Date | undefined, ip?: string) {
    const row = await this.owned(user, id);
    if (!canTransition(user.role, row.status, to)) throw new BadRequestException(`An article in "${row.status}" can't move to "${to}" with your role`);
    const set: Record<string, unknown> = { status: to, updatedBy: user._id };
    if (to === 'scheduled' || to === 'published') {
      if (!row.sources || row.sources.length === 0) throw new BadRequestException('Add at least one source before publishing');
    }
    if (to === 'scheduled') {
      if (!scheduledAt || scheduledAt.getTime() <= Date.now()) throw new BadRequestException('Choose a future publish time');
      set.scheduledAt = scheduledAt;
    }
    if (to === 'published' && !row.publishedAt) set.publishedAt = new Date();
    await this.articles.updateOne({ _id: id }, { $set: set });
    await this.audit.log(user._id.toString(), `article.${to}`, { type: 'article', id }, { from: row.status }, ip);
    if (to === 'published') this.indexNow.notify(`/articles/${row.slug}`, '/', '/latest');
    return { id, status: to };
  }

  async publish(user: AuthUser, id: string, input: ArticlePatchInput, ip?: string) {
    const row = await this.owned(user, id);
    if (!canTransition(user.role, row.status, 'published')) {
      throw new BadRequestException(`An article in "${row.status}" can't be published with your role`);
    }
    if (input.categoryId && !(await this.categories.exists({ _id: input.categoryId, isActive: true }))) {
      throw new BadRequestException('Choose an active category');
    }
    const sources = input.sources ?? row.sources;
    if (!sources?.length) {
      throw new BadRequestException('Add at least one source before publishing');
    }

    const result = await this.articles.updateOne(
      { _id: id, status: row.status, ...this.scope(user) },
      {
        $set: {
          ...this.fields(input, user),
          status: 'published',
          publishedAt: row.publishedAt ?? new Date(),
          updatedBy: user._id,
        },
      },
    );
    if (result.matchedCount !== 1) throw new ConflictException('Article status changed; refresh and try publishing again');

    if (Object.keys(input).length > 0) {
      await this.audit.log(user._id.toString(), 'article.update', { type: 'article', id }, { fields: Object.keys(input) }, ip);
    }
    await this.audit.log(user._id.toString(), 'article.published', { type: 'article', id }, { from: row.status }, ip);
    this.indexNow.notify(`/articles/${row.slug}`, '/', '/latest');
    return { id, status: 'published' as const };
  }

  async remove(user: AuthUser, id: string, ip?: string) {
    const row = await this.owned(user, id);
    await this.articles.deleteOne({ _id: id });
    if (row.status === 'published') this.indexNow.notify(`/articles/${row.slug}`);
    await this.audit.log(user._id.toString(), 'article.delete', { type: 'article', id }, {}, ip);
  }
}
