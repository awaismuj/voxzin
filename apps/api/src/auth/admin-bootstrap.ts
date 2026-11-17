import * as argon2 from 'argon2';
import { ROLES, slugify, type Role } from '@voxzin/shared';
import type { M } from '../common/types';

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

export interface AdminInput {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
}

export type AdminResult =
  | { status: 'created' | 'updated' | 'unchanged'; email: string; role: Role }
  | { status: 'skipped'; reason: string };

/** Accepts "Super Admin", "super-admin", "ADMIN" ... and maps them to a valid role (default super_admin). */
export const normalizeRole = (value?: string): Role | undefined => {
  const wanted = value?.trim().toLowerCase().replace(/[\s-]+/g, '_') || 'super_admin';
  return ROLES.find((candidate) => candidate === wanted);
};

type ExistingUser = {
  _id: { toString(): string };
  passwordHash?: string;
  role?: string;
  name?: string;
  isActive?: boolean;
  authorId?: { toString(): string };
};

/**
 * Makes the admin account match the given settings (the .env file is the source of truth).
 * - Creates the account when it does not exist; otherwise updates name, role and password.
 * - Only re-hashes and signs the user out of other sessions when the password actually changed.
 * - Never logs or returns the password. Existing two-step verification (MFA) is left untouched.
 */
export async function ensureAdmin(
  models: { users: M; authors: M; sessions: M },
  input: AdminInput,
): Promise<AdminResult> {
  const email = input.email?.trim().toLowerCase();
  const password = input.password;
  if (!email || !password) return { status: 'skipped', reason: 'ADMIN_EMAIL and ADMIN_PASSWORD are not both set' };
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return { status: 'skipped', reason: `ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters` };
  }
  const role = normalizeRole(input.role);
  if (!role) return { status: 'skipped', reason: `ADMIN_ROLE must be one of: ${ROLES.join(', ')}` };

  const name = input.name?.trim() || 'Administrator';
  const slug = slugify(name);
  const author = await models.authors.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name, slug, designation: 'Editor' } },
    { upsert: true, new: true },
  );

  const existing = (await models.users
    .findOne({ email })
    .select('passwordHash role name isActive authorId')
    .lean()) as ExistingUser | null;

  const passwordUnchanged = Boolean(
    existing?.passwordHash && (await argon2.verify(existing.passwordHash, password).catch(() => false)),
  );
  const profileUnchanged =
    existing?.role === role &&
    existing?.name === name &&
    existing?.isActive === true &&
    existing?.authorId?.toString() === author._id.toString();

  if (existing && passwordUnchanged && profileUnchanged) return { status: 'unchanged', email, role };

  const set: Record<string, unknown> = { name, role, isActive: true, authorId: author._id };
  const update: Record<string, unknown> = { $set: set };
  if (!passwordUnchanged) {
    set.passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    set.failedLogins = 0;
    update.$unset = { lockedUntil: '' };
  }
  await models.users.updateOne({ email }, update, { upsert: true });

  // A new password invalidates every session that was opened with the old one.
  if (existing && !passwordUnchanged) await models.sessions.deleteMany({ userId: existing._id });

  return { status: existing ? 'updated' : 'created', email, role };
}
