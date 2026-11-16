import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { aiAssistInput } from '@voxzin/shared';
import { z } from 'zod';
import { AuditService } from '../auth/audit.service';
import { Roles, RolesGuard, SessionGuard } from '../auth/guards';
import type { AuthedRequest } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { AiService } from './ai.service';

@Controller('admin/ai')
@UseGuards(SessionGuard, RolesGuard)
@Roles('super_admin', 'admin', 'editor', 'author')
export class AiController {
  constructor(private readonly ai: AiService, private readonly audit: AuditService) {}

  @Post('assist')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async assist(@Req() req: AuthedRequest, @Body(new ZodPipe(aiAssistInput)) body: z.infer<typeof aiAssistInput>) {
    const text = await this.ai.assist(body.task, body.text);
    await this.audit.log(req.auth.user._id.toString(), 'ai.assist', { type: 'ai' }, { task: body.task }, req.ip);
    return { text, aiAssisted: true };
  }
}
