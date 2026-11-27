import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ROLE_RANK, slugify, type Role } from '@voxzin/shared';
import { z } from 'zod';
import { authorInput, categoryInput, countryInput, settingsInput, userInviteInput, userPatchInput } from '@voxzin/shared';
import { AuditService } from '../auth/audit.service';
import { AuthService } from '../auth/auth.service';
import { randomToken, sha256 } from '../common/crypto';
import type { AuthUser, M } from '../common/types';
import { env } from '../config/env';
import { MailService } from '../newsletter/mail.service';

type Id = { toString(): string };
const dup = (e: unknown) => typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;

interface SeoAuditResult {
  summary: {
    published: number;
    titlesMissing: number;
    titlesTooLong: number;
    descriptionsMissing: number;
    descriptionsTooLong: number;
    missingImages: number;
    missingImageAlt: number;
    missingSectionHeadings: number;
    bodyH1Found: number;
    skippedHeadingLevels: number;
    needsAttention: number;
  };
  articles: { id: string; slug: string; title: string; issues: string[] }[];
}

@Injectable()
export class CatalogService implements OnModuleInit {
  constructor(
    @InjectModel('Category') private readonly categories: M,
    @InjectModel('Country') private readonly countries: M,
    @InjectModel('Author') private readonly authors: M,
    @InjectModel('Article') private readonly articles: M,
    @InjectModel('User') private readonly users: M,
    @InjectModel('SiteSettings') private readonly settings: M,
    @InjectModel('TrendingTopic') private readonly trends: M,
    @InjectModel('NewsletterSubscriber') private readonly subscribers: M,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    await this.authors.updateOne(
      { slug: 'voxzin' },
      { $setOnInsert: { name: 'VoxZin', slug: 'voxzin', designation: 'Editorial Team' } },
      { upsert: true },
    );
  }

  // ---- categories
  listCategories() {
    return this.categories.find().sort({ order: 1 }).lean();
  }
  async saveCategory(actor: AuthUser, input: z.infer<typeof categoryInput>, id?: string) {
    try {
      const doc = id
        ? await this.categories.findByIdAndUpdate(id, { $set: input }, { new: true }).lean<{ _id: Id }>()
        : await this.categories.create(input);
      if (!doc) throw new NotFoundException();
      await this.audit.log(actor._id.toString(), id ? 'category.update' : 'category.create', { type: 'category', id: doc._id.toString() });
      return { id: doc._id.toString() };
    } catch (e) {
      if (dup(e)) throw new ConflictException('That slug is already used');
      throw e;
    }
  }
  async deleteCategory(actor: AuthUser, id: string) {
    if (await this.articles.exists({ category: id })) throw new ConflictException('Reassign or delete the articles in this category first');
    await this.categories.deleteOne({ _id: id });
    await this.audit.log(actor._id.toString(), 'category.delete', { type: 'category', id });
  }

  // ---- countries used by the trending catalog
  listCountries() {
    return this.countries.find().sort({ order: 1, name: 1 }).lean();
  }
  async saveCountry(actor: AuthUser, input: z.infer<typeof countryInput>, id?: string) {
    try {
      if (id) {
        const current = await this.countries.findById(id).select('code').lean<{ code: string }>();
        if (!current) throw new NotFoundException();
        if (current.code !== input.code) throw new BadRequestException('Country codes cannot be changed after creation');
      }
      const doc = id
        ? await this.countries.findByIdAndUpdate(id, { $set: input }, { new: true }).lean<{ _id: Id }>()
        : await this.countries.create(input);
      if (!doc) throw new NotFoundException();
      await this.audit.log(actor._id.toString(), id ? 'country.update' : 'country.create', { type: 'country', id: doc._id.toString() });
      return { id: doc._id.toString() };
    } catch (e) {
      if (dup(e)) throw new ConflictException('That country code is already used');
      throw e;
    }
  }

  // ---- authors
  listAuthors() {
    return this.authors.find().select('name slug').sort({ name: 1 }).lean();
  }
  async saveAuthor(actor: AuthUser, input: z.infer<typeof authorInput>, id?: string) {
    try {
      const doc = id
        ? await this.authors.findByIdAndUpdate(id, { $set: input }, { new: true }).lean<{ _id: Id }>()
        : await this.authors.create(input);
      if (!doc) throw new NotFoundException();
      await this.audit.log(actor._id.toString(), id ? 'author.update' : 'author.create', { type: 'author', id: doc._id.toString() });
      return { id: doc._id.toString() };
    } catch (e) {
      if (dup(e)) throw new ConflictException('That slug is already used');
      throw e;
    }
  }

  // ---- users
  async listUsers() {
    const users = await this.users.find()
      .select('email name role isActive mfa.enabled lastLoginAt +inviteTokenHash')
      .sort({ createdAt: 1 })
      .lean<{
        _id: Id;
        email: string;
        name: string;
        role: Role;
        isActive: boolean;
        mfa?: { enabled?: boolean };
        lastLoginAt?: Date;
        inviteTokenHash?: string;
      }[]>();
    return users.map(({ inviteTokenHash, ...user }) => ({ ...user, invitePending: Boolean(inviteTokenHash) }));
  }
  private assertCanManage(actor: AuthUser, targetRole: Role) {
    if (actor.role !== 'super_admin' && ROLE_RANK[targetRole] >= ROLE_RANK[actor.role]) {
      throw new ForbiddenException('You can only manage roles below your own');
    }
  }
  private async sendInvite(email: string, name: string, token: string) {
    if (!this.mail.isConfigured) {
      throw new ServiceUnavailableException('Email invitations are unavailable until SMTP is configured');
    }
    const link = `${env.SITE_URL.replace(/\/+$/, '')}/admin/accept-invite#${token}`;
    const sent = await this.mail.send(
      email,
      'You are invited to VoxZin',
      `Hello ${name},\n\nYou have been invited to join VoxZin as an editorial team member.\nSet your password within 24 hours using this link:\n${link}\n\nYou will be asked to set up two-step verification when you sign in.\n`,
    );
    if (!sent) throw new ServiceUnavailableException('Invitation email could not be sent');
  }
  async createUser(actor: AuthUser, input: z.infer<typeof userInviteInput>, ip?: string) {
    this.assertCanManage(actor, input.role);
    if (!this.mail.isConfigured) {
      throw new ServiceUnavailableException('Email invitations are unavailable until SMTP is configured');
    }
    if (await this.users.exists({ email: input.email })) throw new ConflictException('A user with that email already exists');
    const slugBase = slugify(input.name);
    let author: { _id: Id } | null = null;
    for (let i = 0; i < 20 && !author; i++) {
      try {
        author = await this.authors.create({ name: input.name, slug: i ? `${slugBase}-${i + 1}` : slugBase });
      } catch (e) {
        if (!dup(e)) throw e;
      }
    }
    if (!author) throw new ConflictException('Could not reserve an author profile for this team member');

    const token = randomToken();
    const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60_000);
    let user: { _id: Id };
    try {
      user = await this.users.create({
        email: input.email, name: input.name, role: input.role, authorId: author._id,
        passwordHash: await this.auth.hashPassword(randomToken()), isActive: false,
        inviteTokenHash: sha256(token), inviteExpiresAt,
      });
    } catch (e) {
      await this.authors.deleteOne({ _id: author._id });
      if (dup(e)) throw new ConflictException('A user with that email already exists');
      throw e;
    }
    try {
      await this.sendInvite(input.email, input.name, token);
    } catch (e) {
      await this.users.deleteOne({ _id: user._id });
      await this.authors.deleteOne({ _id: author._id });
      throw e;
    }
    await this.audit.log(actor._id.toString(), 'user.invite', { type: 'user', id: user._id.toString() }, { role: input.role }, ip);
    return { id: user._id.toString() };
  }
  async resendInvite(actor: AuthUser, id: string, ip?: string) {
    const user = await this.users.findById(id).select('+inviteTokenHash +inviteExpiresAt').lean<{
      email: string; name: string; role: Role; isActive: boolean; inviteTokenHash?: string; inviteExpiresAt?: Date;
    }>();
    if (!user) throw new NotFoundException();
    this.assertCanManage(actor, user.role);
    if (user.isActive || !user.inviteTokenHash) throw new BadRequestException('This account has no pending invitation');
    if (!this.mail.isConfigured) {
      throw new ServiceUnavailableException('Email invitations are unavailable until SMTP is configured');
    }
    const token = randomToken();
    const tokenHash = sha256(token);
    const result = await this.users.updateOne(
      { _id: id, isActive: false, inviteTokenHash: user.inviteTokenHash },
      { $set: { inviteTokenHash: tokenHash, inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60_000) } },
    );
    if (result.modifiedCount !== 1) throw new ConflictException('Invitation changed; refresh the user list and try again');
    try {
      await this.sendInvite(user.email, user.name, token);
    } catch (e) {
      const restore = user.inviteExpiresAt
        ? { $set: { inviteTokenHash: user.inviteTokenHash, inviteExpiresAt: user.inviteExpiresAt } }
        : { $set: { inviteTokenHash: user.inviteTokenHash }, $unset: { inviteExpiresAt: 1 } };
      await this.users.updateOne({ _id: id, inviteTokenHash: tokenHash }, restore);
      throw e;
    }
    await this.audit.log(actor._id.toString(), 'user.invite_resent', { type: 'user', id }, {}, ip);
  }
  async patchUser(actor: AuthUser, id: string, input: z.infer<typeof userPatchInput>, ip?: string) {
    const target = await this.users.findById(id).lean<{ role: Role }>();
    if (!target) throw new NotFoundException();
    this.assertCanManage(actor, target.role);
    if (input.role) this.assertCanManage(actor, input.role);
    if (id === actor._id.toString() && (input.isActive === false || (input.role && input.role !== actor.role))) {
      throw new BadRequestException('You can’t change your own role or deactivate yourself');
    }
    await this.users.updateOne({ _id: id }, { $set: input });
    if (input.isActive === false || input.role) await this.auth.revokeAll(id); // force re-login with new rights
    await this.audit.log(actor._id.toString(), 'user.update', { type: 'user', id }, { fields: Object.keys(input) }, ip);
  }
  async revokeSessions(actor: AuthUser, id: string, ip?: string) {
    const target = await this.users.findById(id).lean<{ role: Role }>();
    if (!target) throw new NotFoundException();
    this.assertCanManage(actor, target.role);
    await this.auth.revokeAll(id);
    await this.audit.log(actor._id.toString(), 'user.sessions_revoked', { type: 'user', id }, {}, ip);
  }
  async resetMfa(actor: AuthUser, id: string, ip?: string) {
    await this.users.updateOne({ _id: id }, { $set: { 'mfa.enabled': false }, $unset: { 'mfa.secretEnc': 1 } });
    await this.auth.revokeAll(id);
    await this.audit.log(actor._id.toString(), 'user.mfa_reset', { type: 'user', id }, {}, ip);
  }

  // ---- settings
  async getSettings() {
    return (await this.settings.findOne({ key: 'main' }).lean()) ?? { key: 'main', brandName: 'VoxZin', tagline: "The Voice of What's Trending.", contactEmail: '', publishingTargetPerDay: 6, social: {} };
  }
  async saveSettings(actor: AuthUser, input: z.infer<typeof settingsInput>) {
    await this.settings.updateOne({ key: 'main' }, { $set: input }, { upsert: true });
    await this.audit.log(actor._id.toString(), 'settings.update', { type: 'settings' });
    return this.getSettings();
  }

  // ---- dashboard
  async stats() {
    const [byStatus, categories, authors, trendPending, trendApproved, subscribers] = await Promise.all([
      this.articles.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      this.categories.countDocuments(),
      this.authors.countDocuments(),
      this.trends.countDocuments({ status: 'pending' }),
      this.trends.countDocuments({ status: 'approved' }),
      this.subscribers.countDocuments({ status: 'confirmed' }),
    ]);
    const counts = Object.fromEntries(byStatus.map((r) => [r._id, r.n]));
    return { articles: counts, categories, authors, trends: { pending: trendPending, approved: trendApproved }, subscribers };
  }

  async seoOverview(): Promise<SeoAuditResult> {
    const [report] = await this.articles.aggregate<SeoAuditResult>([
      { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
      {
        $project: {
          title: 1,
          slug: 1,
          publishedAt: 1,
          seoTitleText: { $trim: { input: { $ifNull: ['$seoTitle', ''] } } },
          descriptionText: {
            $trim: {
              input: {
                $cond: [
                  { $gt: [{ $strLenCP: { $trim: { input: { $ifNull: ['$metaDescription', ''] } } } }, 0] },
                  '$metaDescription',
                  { $ifNull: ['$excerpt', ''] },
                ],
              },
            },
          },
          imageUrl: { $trim: { input: { $ifNull: ['$featuredImage.url', ''] } } },
          imageAlt: { $trim: { input: { $ifNull: ['$featuredImage.alt', ''] } } },
          headingLevels: {
            $map: {
              input: {
                $regexFindAll: {
                  input: { $ifNull: ['$content', ''] },
                  regex: /<h([1-6])\b[^>]*>|<p\b[^>]*>\s*##\s/i,
                },
              },
              as: 'heading',
              in: {
                $cond: [
                  { $ne: [{ $arrayElemAt: ['$$heading.captures', 0] }, null] },
                  { $toInt: { $arrayElemAt: ['$$heading.captures', 0] } },
                  2,
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          sectionHeadingCount: {
            $size: {
              $filter: {
                input: '$headingLevels',
                as: 'level',
                cond: { $gt: ['$$level', 1] },
              },
            },
          },
          bodyH1Count: {
            $size: {
              $filter: {
                input: '$headingLevels',
                as: 'level',
                cond: { $eq: ['$$level', 1] },
              },
            },
          },
          headingLevelSkipped: {
            $let: {
              vars: {
                outline: {
                  $reduce: {
                    input: '$headingLevels',
                    initialValue: { previous: 1, skipsLevel: false },
                    in: {
                      previous: '$$this',
                      skipsLevel: {
                        $or: [
                          '$$value.skipsLevel',
                          { $gt: ['$$this', { $add: ['$$value.previous', 1] }] },
                        ],
                      },
                    },
                  },
                },
              },
              in: '$$outline.skipsLevel',
            },
          },
        },
      },
      {
        $addFields: {
          titleMissing: { $eq: [{ $strLenCP: '$seoTitleText' }, 0] },
          titleTooLong: { $gt: [{ $strLenCP: '$seoTitleText' }, 70] },
          descriptionMissing: { $eq: [{ $strLenCP: '$descriptionText' }, 0] },
          descriptionTooLong: { $gt: [{ $strLenCP: '$descriptionText' }, 170] },
          imageMissing: { $eq: ['$imageUrl', ''] },
          imageAltMissing: { $and: [{ $ne: ['$imageUrl', ''] }, { $eq: ['$imageAlt', ''] }] },
        },
      },
      {
        $addFields: {
          issues: {
            $concatArrays: [
              { $cond: ['$titleMissing', ['Add an SEO title'], []] },
              { $cond: ['$titleTooLong', ['Shorten the SEO title to 70 characters or fewer'], []] },
              { $cond: ['$descriptionMissing', ['Add a meta description'], []] },
              { $cond: ['$descriptionTooLong', ['Shorten the meta description to 170 characters or fewer'], []] },
              { $cond: ['$imageMissing', ['Add a featured image'], []] },
              { $cond: ['$imageAltMissing', ['Add featured-image alt text'], []] },
              { $cond: [{ $eq: ['$sectionHeadingCount', 0] }, ['Add section headings beginning at H2'], []] },
              { $cond: [{ $gt: ['$bodyH1Count', 0] }, ['Keep the article title as the only H1'], []] },
              { $cond: ['$headingLevelSkipped', ['Fix the heading outline so it does not skip levels'], []] },
            ],
          },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                published: { $sum: 1 },
                titlesMissing: { $sum: { $cond: ['$titleMissing', 1, 0] } },
                titlesTooLong: { $sum: { $cond: ['$titleTooLong', 1, 0] } },
                descriptionsMissing: { $sum: { $cond: ['$descriptionMissing', 1, 0] } },
                descriptionsTooLong: { $sum: { $cond: ['$descriptionTooLong', 1, 0] } },
                missingImages: { $sum: { $cond: ['$imageMissing', 1, 0] } },
                missingImageAlt: { $sum: { $cond: ['$imageAltMissing', 1, 0] } },
                missingSectionHeadings: { $sum: { $cond: [{ $eq: ['$sectionHeadingCount', 0] }, 1, 0] } },
                bodyH1Found: { $sum: { $cond: [{ $gt: ['$bodyH1Count', 0] }, 1, 0] } },
                skippedHeadingLevels: { $sum: { $cond: ['$headingLevelSkipped', 1, 0] } },
                needsAttention: { $sum: { $cond: [{ $gt: [{ $size: '$issues' }, 0] }, 1, 0] } },
              },
            },
            { $project: { _id: 0 } },
          ],
          articles: [
            { $match: { 'issues.0': { $exists: true } } },
            { $sort: { publishedAt: -1 } },
            { $limit: 50 },
            { $project: { _id: 0, id: { $toString: '$_id' }, slug: 1, title: 1, issues: 1 } },
          ],
        },
      },
      {
        $project: {
          summary: {
            $ifNull: [
              { $arrayElemAt: ['$summary', 0] },
              {
                published: 0,
                titlesMissing: 0,
                titlesTooLong: 0,
                descriptionsMissing: 0,
                descriptionsTooLong: 0,
                missingImages: 0,
                missingImageAlt: 0,
                missingSectionHeadings: 0,
                bodyH1Found: 0,
                skippedHeadingLevels: 0,
                needsAttention: 0,
              },
            ],
          },
          articles: 1,
        },
      },
    ]).exec();
    if (!report) throw new Error('SEO audit returned no result');
    return report;
  }
}
