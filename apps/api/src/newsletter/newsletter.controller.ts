import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Throttle } from '@nestjs/throttler';
import { newsletterInput, newsletterTokenInput } from '@voxzin/shared';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { hmac, safeEqual } from '../common/crypto';
import type { M } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';
import { MailService } from './mail.service';

const token = (purpose: 'confirm' | 'unsubscribe', email: string) => hmac(`${purpose}:${email}`);

@Controller('newsletter')
export class NewsletterController {
  constructor(@InjectModel('NewsletterSubscriber') private readonly subs: M, private readonly mail: MailService) {}

  @Post('subscribe')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async subscribe(@Body(new ZodPipe(newsletterInput)) { email }: z.infer<typeof newsletterInput>) {
    const existing = await this.subs.findOne({ email }).select('status').lean<{ status: string }>();
    if (existing?.status !== 'confirmed') {
      await this.subs.updateOne({ email }, { $set: { status: 'pending' } }, { upsert: true });
      const link = `${env.SITE_URL}/newsletter/confirm?email=${encodeURIComponent(email)}&token=${token('confirm', email)}`;
      await this.mail.send(email, 'Confirm your Voxzin subscription', `Confirm your subscription to the Voxzin Daily Briefing:\n${link}\n\nIf you didn't ask for this, ignore this email.`);
    }
    // Same response whether or not the address is already subscribed (no account enumeration).
    return { message: 'Check your inbox to confirm your subscription.' };
  }

  @Post('confirm')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async confirm(@Body(new ZodPipe(newsletterTokenInput)) b: z.infer<typeof newsletterTokenInput>) {
    if (!safeEqual(b.token, token('confirm', b.email))) throw new BadRequestException('This confirmation link is not valid');
    await this.subs.updateOne({ email: b.email }, { $set: { status: 'confirmed', confirmedAt: new Date() } });
  }

  @Post('unsubscribe')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async unsubscribe(@Body(new ZodPipe(newsletterTokenInput)) b: z.infer<typeof newsletterTokenInput>) {
    if (!safeEqual(b.token, token('unsubscribe', b.email))) throw new BadRequestException('This unsubscribe link is not valid');
    await this.subs.updateOne({ email: b.email }, { $set: { status: 'unsubscribed' } });
  }
}
