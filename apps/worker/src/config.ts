import { config } from 'dotenv';
import { z } from 'zod';

config({ path: ['.env', '../../.env'] });

export const env = z
  .object({
    MONGODB_URI: z.string().startsWith('mongodb'),
    REDIS_URL: z.string().startsWith('redis'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Same key as the API uses (openssl rand -hex 16). Scheduled articles that go live are announced to search engines.
    INDEXNOW_KEY: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().regex(/^[a-f0-9]{32,64}$/).optional(),
    ),
    EDITORIAL_TIMEZONE: z.string().default('Asia/Karachi'),
    SITE_URL: z.string().url().default('http://localhost:3000'),
    SMTP_URL: z.string().optional(),
    SMTP_HOST: z.string().trim().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.preprocess(
      (v) => typeof v === 'string' ? v.toLowerCase() : v,
      z.enum(['true', 'false']).default('false'),
    ).transform((v) => v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().trim().min(1).optional(),
    NEWSLETTER_REPLY_TO: z.string().trim().email().default('newsletter@voxzin.com'),
    NEWSLETTER_DAILY_LIMIT: z.coerce.number().int().min(1).max(300).default(250),
    // Set to false to switch the Google Trends provider off (e.g. if your legal review says to).
    TREND_GOOGLE_RSS_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
    // Extra approved RSS feeds, https only, set by an operator (never by end users).
    TREND_EXTRA_RSS: z
      .string()
      .default('')
      .transform((s) => s.split(',').map((u) => u.trim()).filter((u) => u.startsWith('https://'))),
  })
  .superRefine((config, ctx) => {
    const hasSplitSmtpConfig = Boolean(config.SMTP_HOST || config.SMTP_USER || config.SMTP_PASS);
    if (!config.SMTP_URL && hasSplitSmtpConfig && (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Set SMTP_HOST, SMTP_USER, and SMTP_PASS together, or use SMTP_URL',
        path: ['SMTP_HOST'],
      });
    }
  })
  .parse(process.env);
