import { config } from 'dotenv';
import { z } from 'zod';

// Works when run from apps/api (pnpm scripts) or from the repo root.
config({ path: ['.env', '../../.env'] });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().startsWith('mongodb', 'MONGODB_URI must be a mongodb:// or mongodb+srv:// URI'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  // Secrets: generate with `openssl rand -base64 32`
  APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters'),
  MFA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'MFA_ENCRYPTION_KEY must be 32 bytes, base64-encoded'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  UPLOAD_DIR: z.string().default('./uploads'),
  SMTP_URL: z.string().optional(),
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.preprocess(
    (value) => typeof value === 'string' ? value.toLowerCase() : value,
    z.enum(['true', 'false']).default('false'),
  ).transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().trim().min(1).optional(),
  MAIL_FROM: z.string().default('VoxZin <no-reply@voxzin.com>'),
  // Admin sign-in managed from the environment (see auth/admin-bootstrap.service.ts). Blank values count as unset.
  ADMIN_EMAIL: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().email().optional()),
  ADMIN_PASSWORD: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  ADMIN_NAME: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(100).optional()),
  ADMIN_ROLE: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  AI_PROVIDER: z.enum(['anthropic']).optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-5-5'),
}).superRefine((config, ctx) => {
  const hasSplitSmtpConfig = Boolean(config.SMTP_HOST || config.SMTP_USER || config.SMTP_PASS);
  if (!config.SMTP_URL && hasSplitSmtpConfig && (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Set SMTP_HOST, SMTP_USER, and SMTP_PASS together, or use SMTP_URL',
      path: ['SMTP_HOST'],
    });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast with a readable message; never print values (they may contain secrets).
  const fields = Object.keys(parsed.error.flatten().fieldErrors).join(', ');
  throw new Error(`Invalid environment configuration. Check: ${fields}`);
}
export const env = parsed.data;
