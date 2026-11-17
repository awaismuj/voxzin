import { Schema } from 'mongoose';
import { ARTICLE_STATUSES, ROLES, TREND_STATUSES } from '@voxzin/shared';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const oid = (ref: string, required = false) => ({ type: Schema.Types.ObjectId, ref, required });

export const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, match: SLUG },
    description: { type: String, default: '', maxlength: 300 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
CategorySchema.index({ isActive: 1, order: 1 });

export const CountrySchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, match: /^[A-Z]{2}$/ },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
CountrySchema.index({ isActive: 1, order: 1 });

export const AuthorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, match: SLUG },
    designation: { type: String, maxlength: 100 },
    bio: { type: String, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const SourceSchema = new Schema({ title: { type: String, maxlength: 200 }, url: { type: String, maxlength: 2000 } }, { _id: false });

export const ArticleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, match: SLUG },
    subtitle: { type: String, maxlength: 300 },
    excerpt: { type: String, required: true, maxlength: 400 },
    content: { type: String, required: true },
    featuredImage: { url: { type: String, maxlength: 2000 }, alt: { type: String, maxlength: 300 } },
    category: oid('Category', true),
    author: oid('Author', true),
    tags: [{ type: String, maxlength: 50 }],
    sources: { type: [SourceSchema], default: [] },
    status: { type: String, enum: ARTICLE_STATUSES, default: 'draft' },
    isFeatured: { type: Boolean, default: false },
    isBreaking: { type: Boolean, default: false },
    aiAssisted: { type: Boolean, default: false },
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    readingTime: { type: Number, default: 1, min: 1 },
    seoTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, maxlength: 170 },
    canonicalUrl: { type: String, maxlength: 2000 },
    createdBy: oid('User'),
    updatedBy: oid('User'),
  },
  { timestamps: true },
);
ArticleSchema.index({ status: 1, publishedAt: -1 });
ArticleSchema.index({ category: 1, status: 1, publishedAt: -1 });
ArticleSchema.index({ status: 1, isFeatured: 1, publishedAt: -1 });
ArticleSchema.index({ status: 1, isBreaking: 1, publishedAt: -1 });
ArticleSchema.index({ status: 1, scheduledAt: 1 });
ArticleSchema.index({ createdBy: 1, updatedAt: -1 });
ArticleSchema.index({ tags: 1 });
ArticleSchema.index({ title: 'text', subtitle: 'text', excerpt: 'text' });

export const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, maxlength: 254 },
    name: { type: String, required: true, maxlength: 100 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    authorId: oid('Author'),
    isActive: { type: Boolean, default: true },
    mfa: { secretEnc: { type: String }, enabled: { type: Boolean, default: false } },
    inviteTokenHash: { type: String, select: false },
    inviteExpiresAt: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetExpiresAt: { type: Date, select: false },
    /** Hash of the ADMIN_PASSWORD from the env file that was last applied, so a restart only re-applies it when it changes. */
    envPasswordHash: { type: String, select: false },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const SessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: oid('User', true),
    mfaVerified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    ip: String,
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1 });

export const AuditLogSchema = new Schema(
  {
    actorId: oid('User'),
    action: { type: String, required: true, maxlength: 80 },
    targetType: String,
    targetId: String,
    meta: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

export const TrendingTopicSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    slug: { type: String, required: true, match: SLUG },
    description: { type: String, default: '', maxlength: 5000 },
    category: { type: String, default: 'general', maxlength: 40 },
    country: { type: String, required: true, maxlength: 2 },
    source: { type: String, required: true, maxlength: 60 },
    sourceUrl: { type: String, maxlength: 2000 },
    sourcePublishedAt: Date,
    discoveredAt: { type: Date, default: Date.now },
    lastUpdatedAt: { type: Date, default: Date.now },
    // trendDirection is intentionally never written by the discovery worker: no provider supplies it yet.
    trendDirection: { type: String, enum: ['rising', 'steady', 'falling'] },
    trendMetric: { type: String, maxlength: 60 }, // only values a source actually reported
    verificationStatus: { type: String, enum: ['unverified', 'verified'], default: 'unverified' },
    keywords: [{ type: String, maxlength: 60 }],
    relatedArticles: [oid('Article')],
    status: { type: String, enum: TREND_STATUSES, default: 'pending' },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
TrendingTopicSchema.index({ slug: 1, country: 1 }, { unique: true });
TrendingTopicSchema.index({ status: 1, country: 1, lastUpdatedAt: -1 });
TrendingTopicSchema.index({ status: 1, isFeatured: -1, lastUpdatedAt: -1 });

export const NewsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, maxlength: 254 },
    status: { type: String, enum: ['pending', 'confirmed', 'unsubscribed'], default: 'pending' },
    confirmedAt: Date,
  },
  { timestamps: true },
);

export const MediaSchema = new Schema(
  {
    filename: { type: String, required: true, unique: true },
    originalName: { type: String, maxlength: 200 },
    mime: String,
    size: Number,
    alt: { type: String, default: '', maxlength: 300 },
    uploadedBy: oid('User'),
  },
  { timestamps: true },
);
MediaSchema.index({ createdAt: -1 });

export const SiteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    brandName: { type: String, default: 'Voxzin' },
    tagline: { type: String, default: "The voice of today's trending stories." },
    contactEmail: { type: String, default: '' },
    publishingTargetPerDay: { type: Number, default: 6 },
    social: { x: String, facebook: String, youtube: String, linkedin: String },
  },
  { timestamps: true },
);

export const MODELS = {
  Article: ArticleSchema,
  Category: CategorySchema,
  Country: CountrySchema,
  Author: AuthorSchema,
  User: UserSchema,
  Session: SessionSchema,
  AuditLog: AuditLogSchema,
  TrendingTopic: TrendingTopicSchema,
  NewsletterSubscriber: NewsletterSubscriberSchema,
  Media: MediaSchema,
  SiteSettings: SiteSettingsSchema,
} as const;
