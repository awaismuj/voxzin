import { describe, expect, it } from 'vitest';
import { ensureAdmin, normalizeRole } from './admin-bootstrap';

const never = {} as never; // skip paths must not touch the database

describe('normalizeRole', () => {
  it('maps common spellings and defaults to super_admin', () => {
    expect(normalizeRole('Admin')).toBe('admin');
    expect(normalizeRole('Super Admin')).toBe('super_admin');
    expect(normalizeRole(undefined)).toBe('super_admin');
    expect(normalizeRole('owner')).toBeUndefined();
  });
});

describe('ensureAdmin (skip paths)', () => {
  const models = { users: never, authors: never, sessions: never };
  it('skips without email or password', async () => {
    expect((await ensureAdmin(models, { email: 'a@b.co' })).status).toBe('skipped');
    expect((await ensureAdmin(models, { password: 'x'.repeat(20) })).status).toBe('skipped');
  });
  it('rejects short passwords such as admin123', async () => {
    const r = await ensureAdmin(models, { email: 'a@b.co', password: 'admin123' });
    expect(r).toEqual({ status: 'skipped', reason: expect.stringContaining('at least 12') });
  });
  it('rejects unknown roles', async () => {
    expect((await ensureAdmin(models, { email: 'a@b.co', password: 'x'.repeat(20), role: 'boss' })).status).toBe('skipped');
  });
});

// --- behaviour with in-memory fake models --------------------------------------------------------
import * as argon2 from 'argon2';

type Doc = Record<string, unknown>;
function fakeModels() {
  const users: Doc[] = [];
  const sessionsDeleted: unknown[] = [];
  const authors: Doc[] = [];
  return {
    users,
    sessionsDeleted,
    models: {
      authors: {
        findOneAndUpdate: async (f: Doc, u: { $setOnInsert: Doc }) => {
          let a = authors.find((x) => x.slug === f.slug);
          if (!a) authors.push((a = { _id: `a${authors.length}`, ...u.$setOnInsert }));
          return a;
        },
      },
      users: {
        findOne: (f: Doc) => ({ select: () => ({ lean: async () => users.find((u) => u.email === f.email) ?? null }) }),
        updateOne: async (f: Doc, u: { $set: Doc }) => {
          let doc = users.find((x) => x.email === f.email);
          if (!doc) users.push((doc = { _id: `u${users.length}`, email: f.email }));
          Object.assign(doc, u.$set);
        },
      },
      sessions: { deleteMany: async (f: Doc) => void sessionsDeleted.push(f.userId) },
    } as never,
  };
}

describe('ensureAdmin with the env password', () => {
  const base = { email: 'Boss@Example.com', name: 'Boss', role: 'super_admin' };

  it('creates the account, then leaves a reset password alone on restart', async () => {
    const { users, models } = fakeModels();
    expect((await ensureAdmin(models, { ...base, password: 'env-password-123' })).status).toBe('created');
    const first = users[0]!;
    expect(await argon2.verify(first.passwordHash as string, 'env-password-123')).toBe(true);

    first.passwordHash = await argon2.hash('reset-by-email-456'); // user used the emailed reset link
    expect((await ensureAdmin(models, { ...base, password: 'env-password-123' })).status).toBe('unchanged');
    expect(await argon2.verify(first.passwordHash as string, 'reset-by-email-456')).toBe(true);
  });

  it('applies a changed env password and signs the user out elsewhere', async () => {
    const { users, models, sessionsDeleted } = fakeModels();
    await ensureAdmin(models, { ...base, password: 'env-password-123' });
    expect((await ensureAdmin(models, { ...base, password: 'new-env-password-789' })).status).toBe('updated');
    expect(await argon2.verify(users[0]!.passwordHash as string, 'new-env-password-789')).toBe(true);
    expect(sessionsDeleted).toEqual(['u0']);
  });

  it('adopts an account whose current password already equals the env password', async () => {
    const { users, models, sessionsDeleted } = fakeModels();
    users.push({ _id: 'u0', email: 'boss@example.com', name: 'Boss', role: 'super_admin', isActive: true, authorId: 'a0', passwordHash: await argon2.hash('env-password-123') });
    await ensureAdmin(models, { ...base, password: 'env-password-123' });
    expect(users[0]!.envPasswordHash).toBe(users[0]!.passwordHash);
    expect(sessionsDeleted).toEqual([]);
  });
});
