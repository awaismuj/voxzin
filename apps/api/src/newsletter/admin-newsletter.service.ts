import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  adminNewsletterSubscribersQuery,
  type AdminNewsletterArticle,
  type AdminNewsletterCampaign,
  type AdminNewsletterSubscriber,
  type Paginated,
} from '@voxzin/shared';
import { Types } from 'mongoose';
import type { z } from 'zod';
import { AuditService } from '../auth/audit.service';
import { hmac } from '../common/crypto';
import { escapeRegex, type AuthUser, type M } from '../common/types';
import { env } from '../config/env';
import { MailService } from './mail.service';

interface ArticleRow {
  _id: { toString(): string };
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: { url?: string; alt?: string };
  publishedAt: Date;
}

interface SubscriberRow {
  _id: { toString(): string };
  email: string;
  confirmedAt?: Date;
}

interface CampaignRow {
  _id: { toString(): string };
  article: { title: string; slug: string } | null;
  subject: string;
  status: 'draft' | 'queued' | 'sending' | 'completed';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: Date;
  completedAt?: Date;
}

const utcDay = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class AdminNewsletterService {
  constructor(
    @InjectModel('Article') private readonly articles: M,
    @InjectModel('NewsletterSubscriber') private readonly subscribers: M,
    @InjectModel('NewsletterCampaign') private readonly campaigns: M,
    @InjectModel('NewsletterDelivery') private readonly deliveries: M,
    @InjectModel('NewsletterQuota') private readonly quotas: M,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async status() {
    const quota = await this.quotas.findOne({ day: utcDay() }).select('reserved').lean<{ reserved: number }>();
    return {
      ready: this.mail.isNewsletterConfigured,
      sender: this.mail.isNewsletterConfigured ? env.NEWSLETTER_FROM ?? env.SMTP_FROM ?? null : null,
      dailyLimit: env.NEWSLETTER_DAILY_LIMIT,
      dailyUsed: quota?.reserved ?? 0,
    };
  }

  async listArticles(): Promise<AdminNewsletterArticle[]> {
    const rows = await this.articles
      .find({ status: 'published', publishedAt: { $lte: new Date() } })
      .select('title slug excerpt featuredImage publishedAt')
      .sort({ publishedAt: -1 })
      .limit(100)
      .lean<ArticleRow[]>();
    return rows.map((row) => ({
      id: row._id.toString(),
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      image: row.featuredImage?.url
        ? { url: row.featuredImage.url, alt: row.featuredImage.alt ?? row.title }
        : null,
      publishedAt: row.publishedAt.toISOString(),
    }));
  }

  async listSubscribers(query: z.infer<typeof adminNewsletterSubscribersQuery>): Promise<Paginated<AdminNewsletterSubscriber>> {
    const filter: Record<string, unknown> = { status: 'confirmed' };
    if (query.q) filter.email = { $regex: escapeRegex(query.q), $options: 'i' };
    const [rows, total] = await Promise.all([
      this.subscribers
        .find(filter)
        .select('email confirmedAt')
        .sort({ confirmedAt: -1, email: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<SubscriberRow[]>(),
      this.subscribers.countDocuments(filter),
    ]);
    return {
      items: rows.map((row) => ({
        id: row._id.toString(),
        email: row.email,
        confirmedAt: row.confirmedAt?.toISOString() ?? null,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async listCampaigns(): Promise<{ items: AdminNewsletterCampaign[] }> {
    const rows = await this.campaigns
      .find()
      .populate({ path: 'article', select: 'title slug' })
      .select('article subject status totalRecipients sentCount failedCount skippedCount createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean<CampaignRow[]>();
    return {
      items: rows.map((row) => ({
        id: row._id.toString(),
        article: row.article ?? { title: 'Deleted article', slug: '' },
        subject: row.subject,
        status: row.status,
        totalRecipients: row.totalRecipients,
        sentCount: row.sentCount,
        failedCount: row.failedCount,
        skippedCount: row.skippedCount,
        createdAt: row.createdAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
      })),
    };
  }

  async createCampaign(
    actor: AuthUser,
    input: { articleId: string; subscriberIds: string[] },
    ip?: string,
  ) {
    if (!this.mail.isNewsletterConfigured) {
      throw new ServiceUnavailableException('Set up verified SMTP credentials and SMTP_FROM before sending newsletters');
    }

    const article = await this.articles
      .findOne({ _id: input.articleId, status: 'published', publishedAt: { $lte: new Date() } })
      .select('title slug')
      .lean<{ _id: Types.ObjectId; title: string; slug: string }>();
    if (!article) throw new NotFoundException('Published article not found');

    const subscribers = await this.subscribers
      .find({ _id: { $in: input.subscriberIds }, status: 'confirmed' })
      .select('email')
      .lean<SubscriberRow[]>();
    if (subscribers.length !== input.subscriberIds.length) {
      throw new BadRequestException('Only currently confirmed newsletter subscribers can receive campaigns. Refresh the list and try again.');
    }

    const campaignId = new Types.ObjectId();
    await this.campaigns.create({
      _id: campaignId,
      article: article._id,
      subject: article.title,
      status: 'draft',
      totalRecipients: subscribers.length,
      createdBy: actor._id,
    });

    await this.deliveries.insertMany(
      subscribers.map((subscriber) => ({
        campaign: campaignId,
        subscriber: subscriber._id,
        email: subscriber.email,
        unsubscribeToken: hmac(`unsubscribe:${subscriber.email}`),
      })),
      { ordered: true },
    );
    const queued = await this.campaigns.updateOne({ _id: campaignId, status: 'draft' }, { $set: { status: 'queued' } });
    if (queued.matchedCount !== 1) throw new BadRequestException('The campaign could not be queued');

    await this.audit.log(actor._id.toString(), 'newsletter.campaign.queued', { type: 'newsletter_campaign', id: campaignId.toString() }, {
      articleId: article._id.toString(),
      recipients: subscribers.length,
    }, ip);

    return { id: campaignId.toString(), status: 'queued' as const, recipients: subscribers.length };
  }
}
