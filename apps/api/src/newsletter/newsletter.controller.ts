import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Throttle } from '@nestjs/throttler';
import { newsletterInput, newsletterOneClickInput, newsletterTokenInput } from '@voxzin/shared';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { hmac, safeEqual } from '../common/crypto';
import type { M } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';
import { AllowSignedOneClickUnsubscribe } from '../auth/guards';
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
      await this.mail.send(email, 'Confirm your VoxZin subscription', `Confirm your subscription to the VoxZin Daily Briefing:\n${link}\n\nIf you didn't ask for this, ignore this email.`);
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
    await this.unsubscribeWithToken(b);
  }

  @Post('unsubscribe-one-click')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @AllowSignedOneClickUnsubscribe()
  async unsubscribeOneClick(
    @Query(new ZodPipe(newsletterTokenInput)) b: z.infer<typeof newsletterTokenInput>,
    @Body(new ZodPipe(newsletterOneClickInput)) body: z.infer<typeof newsletterOneClickInput>,
  ) {
    if (body['List-Unsubscribe'] !== 'One-Click') throw new BadRequestException('Invalid one-click unsubscribe request');
    await this.unsubscribeWithToken(b);
  }

  private async unsubscribeWithToken(b: z.infer<typeof newsletterTokenInput>) {
    if (!safeEqual(b.token, token('unsubscribe', b.email))) throw new BadRequestException('This unsubscribe link is not valid');
    await this.subs.updateOne({ email: b.email }, { $set: { status: 'unsubscribed' } });
  }
}
