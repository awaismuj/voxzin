import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { M } from '../common/types';
import { env } from '../config/env';
import { ensureAdmin } from './admin-bootstrap';

/**
 * Keeps the admin sign-in in step with ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME / ADMIN_ROLE from the
 * environment every time the API starts. To change the admin password: edit the env file and restart the API.
 * Remove ADMIN_PASSWORD from the env file to stop managing the account from the environment.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly log = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectModel('User') private readonly users: M,
    @InjectModel('Author') private readonly authors: M,
    @InjectModel('Session') private readonly sessions: M,
  ) {}

  async onApplicationBootstrap() {
    if (!env.ADMIN_EMAIL && !env.ADMIN_PASSWORD) return;
    try {
      const result = await ensureAdmin(
        { users: this.users, authors: this.authors, sessions: this.sessions },
        { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME, role: env.ADMIN_ROLE },
      );
      if (result.status === 'skipped') this.log.warn(`Admin account not synced: ${result.reason}.`);
      else if (result.status !== 'unchanged') this.log.log(`Admin account ${result.status}: ${result.email} (${result.role}).`);
    } catch {
      // Never block the site from starting, and never print env values.
      this.log.error('Admin account sync failed. Check the database connection and the ADMIN_* settings.');
    }
  }
}
