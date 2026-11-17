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
