import { beforeAll, describe, expect, it, vi } from 'vitest';

type Doc = Record<string, unknown> & { _id: string };

const match = (doc: Doc, f: Record<string, unknown>) =>
  Object.entries(f).every(([k, v]) => {
    if (v && typeof v === 'object' && '$gt' in v) return (doc[k] as Date | undefined) !== undefined && (doc[k] as Date) > (v as { $gt: Date }).$gt;
    return doc[k] === v;
  });

function setup(AuthService: new (...a: never[]) => unknown) {
  const users: Doc[] = [{ _id: 'u1', email: 'boss@example.com', name: 'Boss', isActive: true, passwordHash: 'old', failedLogins: 3 }];
  const revoked: unknown[] = [];
  const sent: { to: string; subject: string; text: string }[] = [];
  const usersModel = {
    findOne: (f: Record<string, unknown>) => ({ select: () => ({ lean: async () => users.find((u) => match(u, f)) ?? null }) }),
    updateOne: async (f: Record<string, unknown>, u: { $set?: Doc; $unset?: Record<string, unknown> }) => {
      const doc = users.find((x) => match(x, f));
      if (!doc) return { modifiedCount: 0 };
      Object.assign(doc, u.$set);
      for (const k of Object.keys(u.$unset ?? {})) delete doc[k];
      return { modifiedCount: 1 };
    },
  };
  const sessionsModel = { deleteMany: async (f: Doc) => void revoked.push(f.userId) };
  const audit = { log: async () => undefined };
  const mail = { send: async (to: string, subject: string, text: string) => (sent.push({ to, subject, text }), true) };
  const service = new (AuthService as new (...a: unknown[]) => import('./auth.service').AuthService)(usersModel, sessionsModel, audit, mail);
  return { users, revoked, sent, service };
}

describe('password reset', () => {
  let AuthService: new (...a: never[]) => unknown;
  beforeAll(async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    vi.stubEnv('APP_SECRET', 'x'.repeat(40));
    vi.stubEnv('MFA_ENCRYPTION_KEY', Buffer.alloc(32, 1).toString('base64'));
    vi.stubEnv('SITE_URL', 'https://voxzin.com');
    ({ AuthService } = (await import('./auth.service')) as unknown as { AuthService: new (...a: never[]) => unknown });
  });

  const tokenFrom = (text: string) => /reset-password#([A-Za-z0-9_-]+)/.exec(text)![1]!;
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('emails a link that works once, then changes the password and signs everyone out', async () => {
    const { service, users, sent, revoked } = setup(AuthService);
    await service.requestPasswordReset('boss@example.com');
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('boss@example.com');
    expect(sent[0]!.text).toContain('https://voxzin.com/admin/reset-password#');
    const token = tokenFrom(sent[0]!.text);
    expect(users[0]!.resetTokenHash).not.toBe(token); // only a hash is stored

    await service.resetPassword(token, 'a-brand-new-password');
    expect(users[0]!.passwordHash).not.toBe('old');
    expect(users[0]!.failedLogins).toBe(0);
    expect(users[0]!.resetTokenHash).toBeUndefined();
    expect(revoked).toEqual(['u1']);

    await expect(service.resetPassword(token, 'another-password-123')).rejects.toThrow(/invalid or has expired/);
  });

  it('says nothing different for unknown emails and sends no mail', async () => {
    const { service, sent } = setup(AuthService);
    await expect(service.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    await flush();
    expect(sent).toHaveLength(0);
  });

  it('sends at most one email per minute per account', async () => {
    const { service, sent } = setup(AuthService);
    await service.requestPasswordReset('boss@example.com');
    await service.requestPasswordReset('boss@example.com');
    await flush();
    expect(sent).toHaveLength(1);
  });

  it('rejects expired and made-up links', async () => {
    const { service, users, sent } = setup(AuthService);
    await service.requestPasswordReset('boss@example.com');
    await flush();
    users[0]!.resetExpiresAt = new Date(Date.now() - 1000);
    await expect(service.resetPassword(tokenFrom(sent[0]!.text), 'a-brand-new-password')).rejects.toThrow();
    await expect(service.resetPassword('z'.repeat(43), 'a-brand-new-password')).rejects.toThrow();
  });
});
