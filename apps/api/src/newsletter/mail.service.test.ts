import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { NewsletterQuotaRecord } from '@voxzin/database';
import type { Model } from 'mongoose';

function quotaModel(reservation: { reserved: number } | null) {
  const query = { select: vi.fn(() => ({ lean: vi.fn().mockResolvedValue(reservation) })) };
  return {
    updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    findOneAndUpdate: vi.fn(() => query),
  } as unknown as Model<NewsletterQuotaRecord>;
}

describe('MailService daily quota', () => {
  let MailService: typeof import('./mail.service').MailService;

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    vi.stubEnv('APP_SECRET', 'test-secret-value-that-is-long-enough');
    vi.stubEnv('MFA_ENCRYPTION_KEY', Buffer.alloc(32, 1).toString('base64'));
    vi.stubEnv('SMTP_HOST', 'localhost');
    vi.stubEnv('SMTP_USER', 'test');
    vi.stubEnv('SMTP_PASS', 'test');
    vi.stubEnv('SMTP_FROM', 'VoxZin <newsletter@example.com>');
    vi.stubEnv('NEWSLETTER_DAILY_LIMIT', '250');
    ({ MailService } = await import('./mail.service'));
  });

  it('refuses to send when the shared daily quota is exhausted', async () => {
    const quota = quotaModel(null);
    const mail = new MailService(quota);
    const sendMail = vi.fn();
    Object.defineProperty(mail, 'transport', { value: { sendMail } });

    await expect(mail.send('reader@example.com', 'Test', 'Message'))
      .rejects.toThrow('The daily email sending limit has been reached');
    expect(quota.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reserved: { $lt: 250 } }),
      { $inc: { reserved: 1 } },
      { new: true },
    );
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('reserves one shared slot before sending', async () => {
    const quota = quotaModel({ reserved: 1 });
    const mail = new MailService(quota);
    const sendMail = vi.fn().mockResolvedValue({});
    Object.defineProperty(mail, 'transport', { value: { sendMail } });

    await expect(mail.send('reader@example.com', 'Test', 'Message')).resolves.toBe(true);
    expect(quota.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
      { $setOnInsert: { day: expect.any(String), reserved: 0 } },
      { upsert: true },
    );
    expect(sendMail).toHaveBeenCalledOnce();
  });
});
