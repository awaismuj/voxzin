import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  adminArticleFeedbackQuery,
  type AdminArticleFeedbackDto,
  type ArticleFeedbackDto,
  type ArticleFeedbackPatchInput,
  type HomepageFeedbackDto,
  type Paginated,
} from '@voxzin/shared';
import type {
  articleFeedbackInput,
  articleFeedbackListQuery,
} from '@voxzin/shared';
import type { z } from 'zod';
import type { AuthUser, M } from '../common/types';
import { AuditService } from '../auth/audit.service';

type ArticleRef = { title: string; slug: string } | null;
interface FeedbackRow {
  _id: { toString(): string };
  article: ArticleRef;
  name: string;
  message: string;
  status: 'pending' | 'approved';
  isActive: boolean;
  createdAt: Date;
}
interface HomepageFeedbackRow extends Omit<FeedbackRow, 'article'> {
  article: Exclude<ArticleRef, null>;
}

const livePublished = () => ({ status: 'published', publishedAt: { $lte: new Date() } });
const toPublicDto = (row: FeedbackRow): ArticleFeedbackDto => ({
  id: row._id.toString(),
  name: row.name,
  message: row.message,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel('ArticleFeedback') private readonly feedback: M,
    @InjectModel('Article') private readonly articles: M,
    private readonly audit: AuditService,
  ) {}

  async forArticle(slug: string, query: z.infer<typeof articleFeedbackListQuery>): Promise<Paginated<ArticleFeedbackDto>> {
    const article = await this.articles.findOne({ ...livePublished(), slug }).select('_id').lean<{ _id: { toString(): string } }>();
    if (!article) throw new NotFoundException('Article not found');

    const filter = { article: article._id, status: 'approved', isActive: true };
    const [rows, total] = await Promise.all([
      this.feedback.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean<FeedbackRow[]>(),
      this.feedback.countDocuments(filter),
    ]);
    return {
      items: rows.map(toPublicDto),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async homepage(): Promise<{ items: HomepageFeedbackDto[] }> {
    const rows = await this.feedback
      .aggregate<HomepageFeedbackRow>([
        { $match: { status: 'approved', isActive: true } },
        {
          $lookup: {
            from: this.articles.collection.name,
            localField: 'article',
            foreignField: '_id',
            as: 'article',
          },
        },
        { $unwind: '$article' },
        {
          $match: {
            'article.status': 'published',
            'article.publishedAt': { $lte: new Date() },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 6 },
        { $project: { _id: 1, name: 1, message: 1, createdAt: 1, 'article.title': 1, 'article.slug': 1 } },
      ]);
    return {
      items: rows.map((row) => ({
        ...toPublicDto(row),
        article: row.article,
      })),
    };
  }

  async submit(slug: string, input: z.infer<typeof articleFeedbackInput>) {
    const article = await this.articles.findOne({ ...livePublished(), slug }).select('_id').lean<{ _id: { toString(): string } }>();
    if (!article) throw new NotFoundException('Article not found');
    const feedback = await this.feedback.create({ article: article._id, name: input.name, message: input.message });
    return { id: feedback._id.toString(), status: 'pending' as const };
  }

  async adminList(query: z.infer<typeof adminArticleFeedbackQuery>): Promise<Paginated<AdminArticleFeedbackDto>> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.active) filter.isActive = query.active === 'active';
    const [rows, total] = await Promise.all([
      this.feedback
        .find(filter)
        .populate({ path: 'article', select: 'title slug' })
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<FeedbackRow[]>(),
      this.feedback.countDocuments(filter),
    ]);
    return {
      items: rows.map((row) => ({
        ...toPublicDto(row),
        article: row.article,
        status: row.status,
        isActive: row.isActive,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async update(actor: AuthUser, id: string, input: ArticleFeedbackPatchInput, ip?: string) {
    const result = await this.feedback.updateOne({ _id: id }, { $set: input });
    if (result.matchedCount === 0) throw new NotFoundException('Feedback not found');
    await this.audit.log(actor._id.toString(), 'feedback.update', { type: 'article_feedback', id }, { fields: Object.keys(input) }, ip);
  }

  async remove(actor: AuthUser, id: string, ip?: string) {
    const result = await this.feedback.deleteOne({ _id: id });
    if (result.deletedCount === 0) throw new NotFoundException('Feedback not found');
    await this.audit.log(actor._id.toString(), 'feedback.delete', { type: 'article_feedback', id }, {}, ip);
  }
}
