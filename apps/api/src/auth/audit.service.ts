import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { M } from '../common/types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');
  constructor(@InjectModel('AuditLog') private readonly logs: M) {}

  /** Never throws: auditing must not break a request. Never pass secrets in `meta`. */
  async log(
    actorId: string | null,
    action: string,
    target?: { type: string; id?: string },
    meta?: Record<string, unknown>,
    ip?: string,
  ) {
    try {
      await this.logs.create({ actorId: actorId ?? undefined, action, targetType: target?.type, targetId: target?.id, meta, ip });
    } catch (e) {
      this.logger.error(`audit write failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }
}
