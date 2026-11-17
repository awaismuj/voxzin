import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PRIVILEGED_ROLES } from '@voxzin/shared';
import { decrypt, encrypt, randomToken, sha256 } from '../common/crypto';
import type { AuthSession, AuthUser, M } from '../common/types';
import { env } from '../config/env';
import { MailService } from '../newsletter/mail.service';
import { AuditService } from './audit.service';

authenticator.options = { window: 1 }; // tolerate one 30s step of clock drift

export const SESSION_COOKIE = 'sp_session';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const RESET_TTL_MS = 30 * 60_000;
const RESET_COOLDOWN_MS = 60_000; // at most one reset email per account per minute

export const publicUser = (u: AuthUser, mfaVerified: boolean) => ({
  id: u._id.toString(),
  email: u.email,
  name: u.name,
  role: u.role,
  mfaEnabled: Boolean(u.mfa?.enabled),
  mfaVerified,
  mfaRequired: PRIVILEGED_ROLES.includes(u.role),
});

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;
  private readonly log = new Logger('PasswordReset');

  constructor(
    @InjectModel('User') private readonly users: M,
    @InjectModel('Session') private readonly sessions: M,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  private dummy() {
    return (this.dummyHash ??= argon2.hash(randomToken()));
  }

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const invalid = () => new UnauthorizedException('Invalid email or password');
    const user = await this.users
      .findOne({ email })
      .lean<AuthUser & { passwordHash: string; failedLogins?: number; lockedUntil?: Date }>();

    if (!user || !user.isActive) {
      await argon2.verify(await this.dummy(), password).catch(() => false); // equalise timing
      await this.audit.log(null, 'auth.login_failed', { type: 'user' }, { reason: 'unknown_or_inactive' }, ip);
      throw invalid();
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log(user._id.toString(), 'auth.login_blocked_locked', { type: 'user', id: user._id.toString() }, {}, ip);
      throw invalid();
    }
    const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!ok) {
      const fails = (user.failedLogins ?? 0) + 1;
      const lock = fails >= MAX_FAILS;
      await this.users.updateOne(
        { _id: user._id },
        { $set: lock ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails } },
      );
      await this.audit.log(user._id.toString(), lock ? 'auth.account_locked' : 'auth.login_failed', { type: 'user', id: user._id.toString() }, {}, ip);
      throw invalid();
    }

    await this.users.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: 1 } });
    const token = randomToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3_600_000);
    await this.sessions.create({ tokenHash: sha256(token), userId: user._id, mfaVerified: false, expiresAt, ip, userAgent: userAgent?.slice(0, 300) });
    await this.audit.log(user._id.toString(), 'auth.login', { type: 'user', id: user._id.toString() }, {}, ip);
    return { token, expiresAt, user: publicUser(user, false) };
  }

  async resolve(token: string): Promise<{ user: AuthUser; session: AuthSession } | null> {
    const session = await this.sessions
      .findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } })
      .lean<AuthSession & { userId: unknown }>();
    if (!session) return null;
    const user = await this.users.findOne({ _id: session.userId, isActive: true }).lean<AuthUser>();
    return user ? { user, session } : null;
  }

  async logout(token: string) {
    await this.sessions.deleteOne({ tokenHash: sha256(token) });
  }

  async acceptInvite(token: string, password: string) {
    const filter = { inviteTokenHash: sha256(token), inviteExpiresAt: { $gt: new Date() }, isActive: false };
    const user = await this.users.findOne(filter).select('_id').lean<{ _id: { toString(): string } }>();
    if (!user) throw new BadRequestException('This invitation link is invalid or expired');
    const result = await this.users.updateOne(
      { ...filter, _id: user._id },
      {
        $set: { passwordHash: await this.hashPassword(password), isActive: true, failedLogins: 0 },
        $unset: { inviteTokenHash: 1, inviteExpiresAt: 1, lockedUntil: 1 },
      },
    );
    if (result.modifiedCount !== 1) throw new BadRequestException('This invitation link is invalid or expired');
  }

  /**
   * Emails a one-time reset link. Always resolves the same way whether or not the address belongs to an
   * account, so the form cannot be used to find out which emails are registered.
   */
  async requestPasswordReset(email: string, ip?: string) {
    const user = await this.users
      .findOne({ email, isActive: true })
      .select('name resetExpiresAt')
      .lean<{ _id: { toString(): string }; name: string; resetExpiresAt?: Date }>();
    if (!user) return;
    const issuedAt = user.resetExpiresAt ? user.resetExpiresAt.getTime() - RESET_TTL_MS : 0;
    if (Date.now() - issuedAt < RESET_COOLDOWN_MS) return; // a link was sent a moment ago

    const token = randomToken();
    await this.users.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash: sha256(token), resetExpiresAt: new Date(Date.now() + RESET_TTL_MS) } },
    );
    await this.audit.log(user._id.toString(), 'auth.password_reset_requested', { type: 'user', id: user._id.toString() }, {}, ip);

    // The token travels in the URL fragment, so it is not sent to the server or written to access logs.
    const link = `${env.SITE_URL.replace(/\/+$/, '')}/admin/reset-password#${token}`;
    // Not awaited: the response time must not reveal whether an email was sent.
    void this.mail
      .send(
        email,
        'Reset your Voxzin password',
        `Hello ${user.name},\n\nWe received a request to reset your Voxzin password. Use this link within 30 minutes:\n${link}\n\nIf you did not ask for this, you can ignore this email. Your password will not change.\n`,
      )
      .catch(() => this.log.error('Could not send the password reset email. Check the SMTP settings.'));
  }

  async resetPassword(token: string, password: string, ip?: string) {
    const invalid = () => new BadRequestException('This reset link is invalid or has expired. Request a new one.');
    const filter = { resetTokenHash: sha256(token), resetExpiresAt: { $gt: new Date() }, isActive: true };
    const user = await this.users.findOne(filter).select('_id email name').lean<{ _id: { toString(): string }; email: string; name: string }>();
    if (!user) throw invalid();
    const result = await this.users.updateOne(
      { ...filter, _id: user._id },
      {
        $set: { passwordHash: await this.hashPassword(password), failedLogins: 0 },
        $unset: { resetTokenHash: 1, resetExpiresAt: 1, lockedUntil: 1 },
      },
    );
    if (result.modifiedCount !== 1) throw invalid(); // the link was used by someone else a moment ago
    await this.revokeAll(user._id.toString()); // signs out every session opened with the old password
    await this.audit.log(user._id.toString(), 'auth.password_reset_completed', { type: 'user', id: user._id.toString() }, {}, ip);
    void this.mail
      .send(user.email, 'Your Voxzin password was changed', `Hello ${user.name},\n\nThe password for your Voxzin account was just changed. If this was not you, contact the site owner right away.\n`)
      .catch(() => undefined);
  }

  async revokeAll(userId: string) {
    await this.sessions.deleteMany({ userId });
  }

  private async codeValid(user: AuthUser, code: string): Promise<boolean> {
    const row = await this.users.findOne({ _id: user._id }).select('mfa.secretEnc').lean<{ mfa?: { secretEnc?: string } }>();
    if (!row?.mfa?.secretEnc) return false;
    return authenticator.check(code, decrypt(row.mfa.secretEnc));
  }

  async mfaSetup(user: AuthUser) {
    if (user.mfa?.enabled) throw new BadRequestException('MFA is already enabled');
    const secret = authenticator.generateSecret();
    await this.users.updateOne({ _id: user._id }, { $set: { 'mfa.secretEnc': encrypt(secret), 'mfa.enabled': false } });
    const otpauthUrl = authenticator.keyuri(user.email, 'Voxzin', secret);
    return { secret, otpauthUrl, qrDataUrl: await QRCode.toDataURL(otpauthUrl) };
  }

  async mfaEnable(user: AuthUser, session: AuthSession, code: string, ip?: string) {
    if (!(await this.codeValid(user, code))) throw new BadRequestException('That code is not valid. Try the next one.');
    await this.users.updateOne({ _id: user._id }, { $set: { 'mfa.enabled': true } });
    await this.sessions.updateOne({ _id: session._id }, { $set: { mfaVerified: true } });
    await this.audit.log(user._id.toString(), 'auth.mfa_enabled', { type: 'user', id: user._id.toString() }, {}, ip);
  }

  async mfaVerify(user: AuthUser, session: AuthSession, code: string, ip?: string) {
    if (!user.mfa?.enabled) throw new BadRequestException('MFA is not set up for this account');
    if (!(await this.codeValid(user, code))) {
      await this.audit.log(user._id.toString(), 'auth.mfa_failed', { type: 'user', id: user._id.toString() }, {}, ip);
      throw new UnauthorizedException('That code is not valid. Try the next one.');
    }
    await this.sessions.updateOne({ _id: session._id }, { $set: { mfaVerified: true } });
    await this.audit.log(user._id.toString(), 'auth.mfa_verified', { type: 'user', id: user._id.toString() }, {}, ip);
  }

  hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }
}
