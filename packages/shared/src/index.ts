import { z } from 'zod';

export const ARTICLE_STATUSES = [
  'research',
  'idea',
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'archived',
] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/** Default content categories. /trending is a dashboard (Phase 5), not a category. */
export const DEFAULT_CATEGORIES = [
  { slug: 'technology', name: 'Technology', description: 'Gadgets, software, cybersecurity and emerging technology.' },
  { slug: 'ai', name: 'AI', description: 'AI products, research, tools and how businesses use them.' },
  { slug: 'business', name: 'Business', description: 'Markets, startups, companies and the economy.' },
  { slug: 'world', name: 'World', description: 'International developments and public affairs.' },
  { slug: 'entertainment', name: 'Entertainment', description: 'Film, television, streaming, music and gaming.' },
  { slug: 'sports', name: 'Sports', description: 'Football, cricket, basketball, tennis and major tournaments.' },
  { slug: 'science', name: 'Science', description: 'Space, research, discoveries and the environment.' },
  { slug: 'lifestyle', name: 'Lifestyle', description: 'Productivity, education, travel and everyday life.' },
  { slug: 'internet-culture', name: 'Internet Culture', description: 'Viral trends, online communities and digital culture.' },
] as const;

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

export const listArticlesQuery = z.object({
  category: slugSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type ListArticlesQuery = z.infer<typeof listArticlesQuery>;

export interface CategoryDto {
  slug: string;
  name: string;
  description: string;
}

export interface CountryDto {
  code: string;
  name: string;
}

export interface MediaAssetDto {
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  alt: string;
  createdAt: string;
  url: string;
}

export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: { url: string; alt: string } | null;
  category: { name: string; slug: string };
  publishedAt: string;
  readingTime: number;
}

export interface ArticleDetail extends ArticleSummary {
  subtitle: string | null;
  /** Sanitized HTML. The API sanitizes before sending. */
  content: string;
  updatedAt: string;
  author: { name: string; slug: string; designation: string | null };
  sources: { title: string; url: string }[];
  related: ArticleSummary[];
  seo: { title: string; description: string; canonicalUrl: string | null };
}

export interface HomeFeed {
  breaking: { slug: string; title: string }[];
  trending: { title: string; slug: string; country: string }[];
  hero: ArticleSummary | null;
  topStories: ArticleSummary[];
  featured: ArticleSummary[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------- roles & workflow
export const ROLES = ['super_admin', 'admin', 'editor', 'author'] as const;
export type Role = (typeof ROLES)[number];
export const PRIVILEGED_ROLES: readonly Role[] = ['super_admin', 'admin', 'editor'];
export const ROLE_RANK: Record<Role, number> = { super_admin: 4, admin: 3, editor: 2, author: 1 };

export const TRANSITIONS: Record<ArticleStatus, readonly ArticleStatus[]> = {
  research: ['idea', 'draft'],
  idea: ['research', 'draft'],
  draft: ['research', 'idea', 'in_review'],
  in_review: ['draft', 'approved'],
  approved: ['draft', 'scheduled', 'published'],
  scheduled: ['approved', 'published'],
  published: ['draft', 'archived'],
  archived: ['draft'],
};
export const AUTHOR_EDITABLE: readonly ArticleStatus[] = ['research', 'idea', 'draft'];
const AUTHOR_TARGETS: readonly ArticleStatus[] = ['research', 'idea', 'draft', 'in_review'];

/** Publishing always passes through `approved`: authors can never approve or publish. */
export function canTransition(role: Role, from: ArticleStatus, to: ArticleStatus): boolean {
  if (!TRANSITIONS[from].includes(to)) return false;
  if (role === 'author') return AUTHOR_EDITABLE.includes(from) && AUTHOR_TARGETS.includes(to);
  return true;
}

export function slugify(input: string, max = 80): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/, '') || 'item'
  );
}

// ---------------------------------------------------------------- trends
export const TREND_COUNTRIES = ['WW', 'PK', 'IN', 'US', 'GB', 'CA', 'AU', 'DE'] as const;
export const TREND_COUNTRY_NAMES: Record<(typeof TREND_COUNTRIES)[number], string> = {
  WW: 'Worldwide', PK: 'Pakistan', IN: 'India', US: 'United States', GB: 'United Kingdom',
  CA: 'Canada', AU: 'Australia', DE: 'Germany',
};
export const DEFAULT_TREND_COUNTRIES = TREND_COUNTRIES.map((code, order) => ({
  code,
  name: TREND_COUNTRY_NAMES[code],
  order,
  isActive: true,
}));
export const countryCodeSchema = z.string().regex(/^(?:WW|[A-Z]{2})$/, 'Use a two-letter country code');
export const TREND_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;

export interface TrendTopicDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  country: string;
  source: string;
  sourceUrl: string | null;
  trendMetric: string | null;
  discoveredAt: string;
  lastUpdatedAt: string;
  isFeatured: boolean;
  keywords: string[];
  related: { slug: string; title: string }[];
}

// ---------------------------------------------------------------- inputs
export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const httpsUrl = z
  .string()
  .url()
  .max(2000)
  .refine((u) => u.startsWith('https://'), 'Use an https:// link');
const emailSchema = z.string().trim().email().max(254).transform((e) => e.toLowerCase());
const imageUrl = z
  .string()
  .max(2000)
  .refine((u) => u.startsWith('https://') || u.startsWith('/api/v1/media/'), 'Use an uploaded or https image');

export const loginInput = z.object({ email: emailSchema, password: z.string().min(1).max(200) });
export const mfaCodeInput = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });

export const articleInput = z.object({
  title: z.string().trim().min(5).max(200),
  subtitle: z.string().trim().max(300).optional(),
  excerpt: z.string().trim().min(10).max(400),
  content: z.string().min(20).max(200_000),
  categoryId: objectIdSchema,
  authorId: objectIdSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
  sources: z.array(z.object({ title: z.string().trim().min(1).max(200), url: httpsUrl })).max(30).default([]),
  featuredImage: z.object({ url: imageUrl, alt: z.string().trim().min(1).max(300) }).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(170).optional(),
  canonicalUrl: httpsUrl.optional(),
  isFeatured: z.boolean().default(false),
  isBreaking: z.boolean().default(false),
  aiAssisted: z.boolean().default(false),
});
export const articlePatchInput = articleInput.partial();
export type ArticleInput = z.infer<typeof articleInput>;
export type ArticlePatchInput = z.infer<typeof articlePatchInput>;

export const transitionInput = z.object({
  status: z.enum(ARTICLE_STATUSES),
  scheduledAt: z.coerce.date().optional(),
});

export const adminArticlesQuery = z.object({
  status: z.enum(ARTICLE_STATUSES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const categoryInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(300).default(''),
  order: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
}).refine(({ slug }) => !['admin', 'articles', 'latest', 'search', 'trending'].includes(slug), {
  path: ['slug'],
  message: 'This slug is reserved for a site page',
});
export const countryInput = z.object({
  code: countryCodeSchema,
  name: z.string().trim().min(2).max(80),
  order: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
});
export const mediaListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export const mediaMetadataInput = z.object({
  alt: z.string().trim().min(1).max(300),
});
export const authorInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slugSchema,
  designation: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const userInviteInput = z.object({
  email: emailSchema,
  name: z.string().trim().min(2).max(100),
  role: z.enum(ROLES),
});
export const inviteAcceptInput = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(12, 'Use at least 12 characters').max(200),
});
export const userPatchInput = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const settingsInput = z.object({
  brandName: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(120).default(''),
  contactEmail: z.union([emailSchema, z.literal('')]).default(''),
  publishingTargetPerDay: z.coerce.number().int().min(1).max(50).default(6),
  social: z
    .object({
      x: z.union([httpsUrl, z.literal('')]).default(''),
      facebook: z.union([httpsUrl, z.literal('')]).default(''),
      youtube: z.union([httpsUrl, z.literal('')]).default(''),
      linkedin: z.union([httpsUrl, z.literal('')]).default(''),
    })
    .default({}),
});

export const searchQuery = z.object({
  q: z.string().trim().min(2).max(100),
  category: slugSchema.optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

export const trendListQuery = z.object({
  country: countryCodeSchema.default('WW'),
  category: slugSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const trendAdminQuery = z.object({
  status: z.enum(TREND_STATUSES).optional(),
  country: countryCodeSchema.optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});
export const trendCreateInput = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).default(''),
  category: z.string().trim().max(40).default('general'),
  country: countryCodeSchema.default('WW'),
  sourceUrl: httpsUrl.optional(),
});
export const trendPatchInput = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(40).optional(),
  status: z.enum(TREND_STATUSES).optional(),
  verificationStatus: z.enum(['unverified', 'verified']).optional(),
  isFeatured: z.boolean().optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  relatedArticleIds: z.array(objectIdSchema).max(20).optional(),
});

export const newsletterInput = z.object({ email: emailSchema });
export const newsletterTokenInput = z.object({ email: emailSchema, token: z.string().regex(/^[a-f0-9]{64}$/) });
export const aiAssistInput = z.object({
  task: z.enum(['headlines', 'outline', 'summary', 'seo', 'readability']),
  text: z.string().trim().min(20).max(20_000),
});
