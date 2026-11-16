import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PRIVILEGED_ROLES } from '@voxzin/shared';
import { decrypt, encrypt, randomToken, sha256 } from '../common/crypto';
import type { AuthSession, AuthUser, M } from '../common/types';
import { env } from '../config/env';
import { AuditService } from './audit.service';

authenticator.options = { window: 1 }; // tolerate one 30s step of clock drift

export const SESSION_COOKIE = 'sp_session';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

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

  constructor(
    @InjectModel('User') private readonly users: M,
    @InjectModel('Session') private readonly sessions: M,
    private readonly audit: AuditService,
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
