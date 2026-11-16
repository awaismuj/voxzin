import { config } from 'dotenv';
import { z } from 'zod';

config({ path: ['.env', '../../.env'] });

export const env = z
  .object({
    MONGODB_URI: z.string().startsWith('mongodb'),
    REDIS_URL: z.string().startsWith('redis'),
    EDITORIAL_TIMEZONE: z.string().default('Asia/Karachi'),
    SITE_URL: z.string().url().default('http://localhost:3000'),
    // Set to false to switch the Google Trends provider off (e.g. if your legal review says to).
    TREND_GOOGLE_RSS_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
    // Extra approved RSS feeds, https only, set by an operator (never by end users).
    TREND_EXTRA_RSS: z
      .string()
      .default('')
      .transform((s) => s.split(',').map((u) => u.trim()).filter((u) => u.startsWith('https://'))),
  })
  .parse(process.env);
