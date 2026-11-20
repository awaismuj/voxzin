/* Independent worker: scheduled publishing and trend discovery. Scales separately from the API. */
import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import mongoose from 'mongoose';
import pino from 'pino';
import { env } from './config';
import { handleJob as handle } from './jobs/processors';
import { processNewsletterCampaigns } from './jobs/newsletter-campaigns';

const log = pino({ redact: ['*.password', '*.token', '*.secret'] });
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
const QUEUE = 'system';

const queue = new Queue(QUEUE, {
  connection,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 30_000 }, removeOnComplete: 100, removeOnFail: 500 },
});
const worker = new Worker(QUEUE, (job) => handle(job, log), { connection, concurrency: 1 });
worker.on('failed', (job, err) => log.error({ jobId: job?.id, name: job?.name, attempt: job?.attemptsMade, err: err.message }, 'job failed'));
const newsletterQueue = new Queue('newsletter-campaigns', {
  connection,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 30_000 }, removeOnComplete: 100, removeOnFail: 500 },
});
const newsletterWorker = new Worker(
  'newsletter-campaigns',
  () => processNewsletterCampaigns(log),
  { connection, concurrency: 1 },
);
newsletterWorker.on('failed', (job, err) => log.error({ jobId: job?.id, name: job?.name, err: err.message }, 'newsletter worker job failed'));

async function main() {
  await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  // Schedulers are keyed by id, so restarting the worker never duplicates them.
  await queue.upsertJobScheduler('scheduled-publish', { every: 60_000 }, { name: 'scheduled-publish' });
  await queue.upsertJobScheduler('trend-discovery', { pattern: '0 * * * *', tz: env.EDITORIAL_TIMEZONE }, { name: 'trend-discovery' });
  await newsletterQueue.upsertJobScheduler('newsletter-campaigns', { every: 60_000 }, { name: 'newsletter-campaigns' });
  log.info({ tz: env.EDITORIAL_TIMEZONE }, 'worker ready');
}
main().catch((e) => {
  log.fatal({ err: e instanceof Error ? e.message : 'unknown' }, 'worker failed to start');
  process.exit(1);
});

async function shutdown() {
  await worker.close();
  await queue.close();
  await newsletterWorker.close();
  await newsletterQueue.close();
  await mongoose.disconnect();
  connection.disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
