import type { Job } from 'bullmq';
import type { Logger } from 'pino';
import mongoose from 'mongoose';
import { MODELS } from '@voxzin/database';
import { slugify, submitToIndexNow } from '@voxzin/shared';
import { env } from '../config';
import { ApprovedRssProvider, GoogleTrendsRssProvider } from '../providers/rss';
import type { TrendProvider } from '../providers/types';

const Article = mongoose.model('Article', MODELS.Article);
const TrendingTopic = mongoose.model('TrendingTopic', MODELS.TrendingTopic);
const Country = mongoose.model('Country', MODELS.Country);
const EXPIRE_AFTER_MS = 7 * 24 * 3_600_000;

export async function publishScheduled(log: Logger) {
  const now = new Date();
  const due = await Article.find({ status: 'scheduled', scheduledAt: { $lte: now } }).select('slug').lean<{ _id: unknown; slug: string }[]>();
  if (due.length === 0) return;
  const res = await Article.updateMany(
    { _id: { $in: due.map((a) => a._id) }, status: 'scheduled' },
    { $set: { status: 'published', publishedAt: now } },
  );
  if (res.modifiedCount > 0) log.info({ published: res.modifiedCount }, 'scheduled articles published');

  // Announce the new pages to search engines (Bing, Yandex, ...) so they are crawled within minutes.
  if (res.modifiedCount > 0 && env.INDEXNOW_KEY && env.NODE_ENV === 'production') {
    const site = env.SITE_URL.replace(/\/+$/, '');
    const ok = await submitToIndexNow({
      siteUrl: site,
      key: env.INDEXNOW_KEY,
      urls: [...due.map((a) => `${site}/articles/${a.slug}`), `${site}/`, `${site}/latest`],
    });
    if (!ok) log.warn('IndexNow submission was not accepted');
  }
}

export async function discoverTrends(log: Logger) {
  const providers: { provider: TrendProvider; countries: string[] }[] = [];
  if (env.TREND_GOOGLE_RSS_ENABLED) {
    const activeCountries = await Country.find({ isActive: true, code: { $ne: 'WW' } }).select('code').lean<{ code: string }[]>();
    if (activeCountries.length > 0) {
      providers.push({ provider: new GoogleTrendsRssProvider(), countries: activeCountries.map((country) => country.code) });
    }
  }
  if (env.TREND_EXTRA_RSS.length > 0) providers.push({ provider: new ApprovedRssProvider(env.TREND_EXTRA_RSS), countries: ['WW'] });

  let upserted = 0;
  const failures: string[] = [];
  for (const { provider, countries } of providers) {
    for (const country of countries) {
      try {
        const found = await provider.fetch(country);
        const now = new Date();
        for (const t of found) {
          const slug = slugify(t.title, 100);
          // Topics land as "pending": nothing is public until an editor adds research and approves it.
          await TrendingTopic.updateOne(
            { slug, country: t.country },
            {
              $set: { lastUpdatedAt: now, ...(t.trendMetric ? { trendMetric: t.trendMetric } : {}) },
              $setOnInsert: {
                title: t.title, source: t.source, sourceUrl: t.sourceUrl, sourcePublishedAt: t.sourcePublishedAt,
                discoveredAt: now, status: 'pending', verificationStatus: 'unverified', category: 'general',
              },
            },
            { upsert: true },
          );
          upserted++;
        }
        log.info({ provider: provider.name, country, count: found.length }, 'trend fetch ok');
      } catch (e) {
        // Collect and continue: one failing region must not block the others.
        failures.push(`${provider.name}:${country}`);
        log.warn({ provider: provider.name, country, err: e instanceof Error ? e.message : 'unknown' }, 'trend fetch failed');
      }
    }
  }

  const expired = await TrendingTopic.updateMany(
    { status: { $in: ['pending', 'approved'] }, isFeatured: false, lastUpdatedAt: { $lt: new Date(Date.now() - EXPIRE_AFTER_MS) } },
    { $set: { status: 'expired' } },
  );
  log.info({ upserted, expired: expired.modifiedCount, failures }, 'trend discovery finished');
  // Let BullMQ retry with backoff if every attempted fetch failed.
  if (providers.length > 0 && failures.length > 0 && upserted === 0) throw new Error(`All trend fetches failed: ${failures.join(', ')}`);
}

export async function handleJob(job: Job, log: Logger) {
  switch (job.name) {
    case 'scheduled-publish': return publishScheduled(log);
    case 'trend-discovery': return discoverTrends(log);
    case 'heartbeat': return log.debug('heartbeat');
    default: log.warn({ name: job.name }, 'unknown job');
  }
}
