import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { M } from '../common/types';
import type { MailService } from './mail.service';

type Handler = () => void;

function requestContext(method: string, handler: Handler): ExecutionContext {
  const request = { method, headers: {} };
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('newsletter unsubscribe handling', () => {
  let NewsletterController: typeof import('./newsletter.controller').NewsletterController;
  let hmac: typeof import('../common/crypto').hmac;
  let OriginGuard: typeof import('../auth/guards').OriginGuard;
  let AllowSignedOneClickUnsubscribe: typeof import('../auth/guards').AllowSignedOneClickUnsubscribe;
  let subscribers: { updateOne: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    vi.stubEnv('APP_SECRET', 'test-secret-value-that-is-long-enough');
    vi.stubEnv('MFA_ENCRYPTION_KEY', Buffer.alloc(32, 1).toString('base64'));
    vi.stubEnv('CORS_ORIGINS', 'https://voxzin.com');
    ({ NewsletterController } = await import('./newsletter.controller'));
    ({ hmac } = await import('../common/crypto'));
    ({ OriginGuard, AllowSignedOneClickUnsubscribe } = await import('../auth/guards'));
    subscribers = { updateOne: vi.fn(async () => ({ modifiedCount: 1 })) };
  });

  it('only unsubscribes with a valid signed token and the one-click body', async () => {
    const controller = new NewsletterController(subscribers as unknown as M, {} as MailService);
    const email = 'reader@example.com';
    const token = hmac(`unsubscribe:${email}`);

    await controller.unsubscribeOneClick({ email, token }, { 'List-Unsubscribe': 'One-Click' });
    expect(subscribers.updateOne).toHaveBeenCalledWith({ email }, { $set: { status: 'unsubscribed' } });

    subscribers.updateOne.mockClear();
    await expect(controller.unsubscribeOneClick(
      { email, token: 'a'.repeat(64) },
      { 'List-Unsubscribe': 'One-Click' },
    )).rejects.toThrow('This unsubscribe link is not valid');
    await expect(controller.unsubscribeOneClick(
      { email, token },
      { 'List-Unsubscribe': 'invalid' as 'One-Click' },
    )).rejects.toThrow('Invalid one-click unsubscribe request');
    expect(subscribers.updateOne).not.toHaveBeenCalled();
  });

  it('skips origin checks only for the decorated one-click POST endpoint', () => {
    class Handlers {
      @AllowSignedOneClickUnsubscribe()
      oneClick() {}

      otherPost() {}
    }
    const guard = new OriginGuard(new Reflector());

    expect(guard.canActivate(requestContext('POST', Handlers.prototype.oneClick))).toBe(true);
    expect(() => guard.canActivate(requestContext('POST', Handlers.prototype.otherPost))).toThrow('Origin not allowed');
  });
});
