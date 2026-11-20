/* Independent worker: scheduled publishing and trend discovery. Scales separately from the API. */
import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import mongoose from 'mongoose';
import { rmSync, writeFileSync } from 'node:fs';
import pino from 'pino';
import { env } from './config';
import { handleJob as handle } from './jobs/processors';
import { isNewsletterEmailReady, processNewsletterCampaigns } from './jobs/newsletter-campaigns';

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
connection.on('error', (err) => log.error({ err: err.message }, 'worker Redis connection failed'));
worker.on('error', (err) => log.error({ err: err.message }, 'worker connection failed'));
newsletterWorker.on('error', (err) => log.error({ err: err.message }, 'newsletter worker connection failed'));

const readinessFile = '/tmp/worker-ready';
let readinessTimer: NodeJS.Timeout | undefined;
let systemWorkerReady = false;
let newsletterWorkerReady = false;

worker.on('ready', () => {
  systemWorkerReady = true;
});
newsletterWorker.on('ready', () => {
  newsletterWorkerReady = true;
});
worker.on('closed', () => {
  systemWorkerReady = false;
});
newsletterWorker.on('closed', () => {
  newsletterWorkerReady = false;
});

function refreshReadiness() {
  const ready = mongoose.connection.readyState === 1
    && connection.status === 'ready'
    && worker.isRunning()
    && newsletterWorker.isRunning()
    && systemWorkerReady
    && newsletterWorkerReady
    && isNewsletterEmailReady();
  try {
    if (ready) writeFileSync(readinessFile, String(Date.now()));
    else rmSync(readinessFile, { force: true });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : 'unknown' }, 'worker readiness marker update failed');
    rmSync(readinessFile, { force: true });
  }
}

async function main() {
  rmSync(readinessFile, { force: true });
  await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  // Schedulers are keyed by id, so restarting the worker never duplicates them.
  await queue.upsertJobScheduler('scheduled-publish', { every: 60_000 }, { name: 'scheduled-publish' });
  await queue.upsertJobScheduler('trend-discovery', { pattern: '0 * * * *', tz: env.EDITORIAL_TIMEZONE }, { name: 'trend-discovery' });
  await newsletterQueue.upsertJobScheduler('newsletter-campaigns', { every: 60_000 }, { name: 'newsletter-campaigns' });
  refreshReadiness();
  readinessTimer = setInterval(refreshReadiness, 10_000);
  readinessTimer.unref();
  log.info({ tz: env.EDITORIAL_TIMEZONE, newsletterEmailReady: isNewsletterEmailReady() }, 'worker ready');
}
main().catch((e) => {
  log.fatal({ err: e instanceof Error ? e.message : 'unknown' }, 'worker failed to start');
  process.exit(1);
});

async function shutdown() {
  if (readinessTimer) clearInterval(readinessTimer);
  rmSync(readinessFile, { force: true });
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
