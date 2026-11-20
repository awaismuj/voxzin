import { createTransport } from 'nodemailer';
import mongoose from 'mongoose';
import type { Logger } from 'pino';
import { MODELS, reserveNewsletterQuota, type NewsletterQuotaRecord } from '@voxzin/database';
import { env } from '../config';
import { articleNewsletterEmail } from './newsletter-email';

const Campaign = mongoose.model('NewsletterCampaign', MODELS.NewsletterCampaign);
const Delivery = mongoose.model('NewsletterDelivery', MODELS.NewsletterDelivery);
const Subscriber = mongoose.model('NewsletterSubscriber', MODELS.NewsletterSubscriber);
const Quota = mongoose.model<NewsletterQuotaRecord>('NewsletterQuota', MODELS.NewsletterQuota);

interface CampaignRow {
  _id: { toString(): string };
  article: { title: string; slug: string; excerpt: string; featuredImage?: { url?: string; alt?: string } } | null;
  subject: string;
}

interface DeliveryRow {
  _id: { toString(): string };
  campaign: { toString(): string };
  subscriber: { toString(): string };
  email: string;
  unsubscribeToken: string;
}

function createSmtpTransport() {
  if (env.SMTP_URL) return createTransport(env.SMTP_URL);
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return undefined;
  return createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

const transport = createSmtpTransport();
const siteUrl = env.SITE_URL.replace(/\/+$/, '');
export async function processNewsletterCampaigns(log: Logger) {
  if (!transport || !env.SMTP_FROM) return;

  const staleBefore = new Date(Date.now() - 15 * 60_000);
  await Campaign.updateMany(
    { status: 'sending', updatedAt: { $lt: staleBefore } },
    { $set: { status: 'queued' } },
  );
  await Delivery.updateMany(
    { status: 'sending', updatedAt: { $lt: staleBefore } },
    { $set: { status: 'pending' } },
  );

  const day = new Date().toISOString().slice(0, 10);
  const quota = await Quota.findOne({ day }).select('reserved').lean<{ reserved: number }>();
  let remaining = Math.max(0, env.NEWSLETTER_DAILY_LIMIT - (quota?.reserved ?? 0));
  if (remaining === 0) return;

  let dailyLimitReached = false;
  while (remaining > 0) {
    const queued = await Campaign.findOne({ status: 'queued' }).sort({ createdAt: 1 }).select('_id').lean<{ _id: mongoose.Types.ObjectId }>();
    if (!queued) return;
    const campaign = await Campaign.findOneAndUpdate(
      { _id: queued._id, status: 'queued' },
      { $set: { status: 'sending' } },
      { new: true },
    )
      .populate({ path: 'article', match: { status: 'published', publishedAt: { $lte: new Date() } }, select: 'title slug excerpt featuredImage' })
      .lean<CampaignRow>();
    if (!campaign) continue;

    if (!campaign.article) {
      const failed = await Delivery.updateMany(
        { campaign: campaign._id, status: 'pending' },
        { $set: { status: 'failed', error: 'Article is no longer published' } },
      );
      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { failedCount: failed.modifiedCount }, $set: { status: 'completed', completedAt: new Date() } },
      );
      continue;
    }

    while (remaining > 0) {
      const delivery = await Delivery.findOneAndUpdate(
        { campaign: campaign._id, status: 'pending' },
        { $set: { status: 'sending' } },
        { new: true },
      ).select('+unsubscribeToken').lean<DeliveryRow>();
      if (!delivery) break;

      const unsubscribeUrl = new URL('/api/v1/newsletter/unsubscribe-one-click', siteUrl);
      unsubscribeUrl.searchParams.set('email', delivery.email);
      unsubscribeUrl.searchParams.set('token', delivery.unsubscribeToken);
      const browserUnsubscribeUrl = new URL('/newsletter/unsubscribe', siteUrl);
      browserUnsubscribeUrl.searchParams.set('email', delivery.email);
      browserUnsubscribeUrl.searchParams.set('token', delivery.unsubscribeToken);
      const message = articleNewsletterEmail(campaign.article, siteUrl, browserUnsubscribeUrl.toString());
      if (!(await reserveNewsletterQuota(Quota, env.NEWSLETTER_DAILY_LIMIT))) {
        await Delivery.updateOne({ _id: delivery._id, status: 'sending' }, { $set: { status: 'pending' } });
        dailyLimitReached = true;
        break;
      }
      await Delivery.updateOne({ _id: delivery._id, status: 'sending' }, { $set: { attemptedAt: new Date() } });
      remaining--;
      const activeSubscriber = await Subscriber.updateOne(
        { _id: delivery.subscriber, status: 'confirmed' },
        { $set: { status: 'confirmed' } },
      );
      if (activeSubscriber.matchedCount !== 1) {
        await Delivery.updateOne({ _id: delivery._id, status: 'sending' }, { $set: { status: 'skipped' } });
        await Campaign.updateOne({ _id: campaign._id }, { $inc: { skippedCount: 1 } });
        continue;
      }

      try {
        await transport.sendMail({
          from: env.SMTP_FROM,
          replyTo: env.NEWSLETTER_REPLY_TO,
          to: delivery.email,
          subject: campaign.subject || message.subject,
          html: message.html,
          text: message.text,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl.toString()}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
        const sentAt = new Date();
        await Delivery.updateOne({ _id: delivery._id, status: 'sending' }, { $set: { status: 'sent', sentAt } });
        await Campaign.updateOne({ _id: campaign._id }, { $inc: { sentCount: 1 } });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : 'Email provider rejected the message';
        await Delivery.updateOne(
          { _id: delivery._id, status: 'sending' },
          { $set: { status: 'failed', error: messageText.slice(0, 300) } },
        );
        await Campaign.updateOne({ _id: campaign._id }, { $inc: { failedCount: 1 } });
        log.warn({ campaignId: campaign._id.toString(), deliveryId: delivery._id.toString() }, 'newsletter delivery failed');
      }
    }

    const pending = await Delivery.countDocuments({ campaign: campaign._id, status: { $in: ['pending', 'sending'] } });
    await Campaign.updateOne(
      { _id: campaign._id, status: 'sending' },
      pending > 0
        ? { $set: { status: 'queued' } }
        : { $set: { status: 'completed', completedAt: new Date() } },
    );
    if (pending > 0 || dailyLimitReached) return;
  }
}
