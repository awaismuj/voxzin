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
  envPasswordHash?: string;
  role?: string;
  name?: string;
  isActive?: boolean;
  authorId?: { toString(): string };
};

/**
 * Makes the admin account match the env file settings.
 * - Creates the account when it does not exist; keeps name and role in step with the env.
 * - The env password is applied only when it is new or has been changed in the env file. After that the
 *   password can be changed by the emailed reset link without a restart undoing it.
 * - A newly applied password signs the user out of other sessions and clears any lockout.
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
    .select('+passwordHash +envPasswordHash role name isActive authorId')
    .lean()) as ExistingUser | null;

  const verifies = (hash?: string) => (hash ? argon2.verify(hash, password).catch(() => false) : Promise.resolve(false));
  // Has this exact env password already been applied before? (Then leave the current password alone.)
  const envAlreadyApplied = await verifies(existing?.envPasswordHash);
  const currentMatchesEnv = envAlreadyApplied ? false : await verifies(existing?.passwordHash);

  const set: Record<string, unknown> = { name, role, isActive: true, authorId: author._id };
  const update: Record<string, unknown> = { $set: set };
  let passwordApplied = false;
  if (!envAlreadyApplied) {
    if (currentMatchesEnv) {
      set.envPasswordHash = existing!.passwordHash; // already the same password; just remember it was applied
    } else {
      const hash = await argon2.hash(password, { type: argon2.argon2id });
      set.passwordHash = hash;
      set.envPasswordHash = hash;
      set.failedLogins = 0;
      update.$unset = { lockedUntil: '' };
      passwordApplied = true;
    }
  }

  const profileUnchanged =
    existing?.role === role &&
    existing?.name === name &&
    existing?.isActive === true &&
    existing?.authorId?.toString() === author._id.toString();
  if (existing && envAlreadyApplied && profileUnchanged) return { status: 'unchanged', email, role };

  await models.users.updateOne({ email }, update, { upsert: true });
  if (existing && passwordApplied) await models.sessions.deleteMany({ userId: existing._id });

  return { status: existing ? 'updated' : 'created', email, role };
}
