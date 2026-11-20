import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createTransport, type Transporter } from 'nodemailer';
import { reserveNewsletterQuota, type NewsletterQuotaRecord } from '@voxzin/database';
import type { Model } from 'mongoose';
import { env } from '../config/env';

@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private readonly transport?: Transporter = this.createTransport();

  constructor(@InjectModel('NewsletterQuota') private readonly quota: Model<NewsletterQuotaRecord>) {}

  private createTransport() {
    if (env.SMTP_URL) return createTransport(env.SMTP_URL);
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return undefined;
    return createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }

  get isConfigured() {
    return Boolean(this.transport);
  }

  get isNewsletterConfigured() {
    return Boolean(this.transport && (env.NEWSLETTER_FROM || env.SMTP_FROM));
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      // No provider configured: say so plainly instead of pretending an email was delivered.
      this.log.warn(`SMTP is not configured, email to ${to} was NOT sent${env.NODE_ENV === 'production' ? '' : ` (dev). Subject: ${subject}\n${text}`}`);
      return false;
    }
    if (!(await reserveNewsletterQuota(this.quota, env.NEWSLETTER_DAILY_LIMIT))) {
      throw new ServiceUnavailableException('The daily email sending limit has been reached');
    }
    await this.transport.sendMail({ from: env.SMTP_FROM ?? env.MAIL_FROM, to, subject, text });
    return true;
  }
}
