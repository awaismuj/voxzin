import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminNewsletterCampaignInput,
  adminNewsletterSubscribersQuery,
} from '@voxzin/shared';
import type { z } from 'zod';
import { Roles, RolesGuard, SessionGuard } from '../auth/guards';
import type { AuthedRequest } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { AdminNewsletterService } from './admin-newsletter.service';

@Controller('admin/newsletter')
@UseGuards(SessionGuard, RolesGuard)
@Roles('super_admin', 'admin', 'editor')
export class AdminNewsletterController {
  constructor(private readonly newsletter: AdminNewsletterService) {}

  @Get('status')
  status() {
    return this.newsletter.status();
  }

  @Get('articles')
  articles() {
    return this.newsletter.listArticles();
  }

  @Get('subscribers')
  subscribers(@Query(new ZodPipe(adminNewsletterSubscribersQuery)) query: z.infer<typeof adminNewsletterSubscribersQuery>) {
    return this.newsletter.listSubscribers(query);
  }

  @Get('campaigns')
  campaigns() {
    return this.newsletter.listCampaigns();
  }

  @Post('campaigns')
  @HttpCode(202)
  createCampaign(
    @Req() req: AuthedRequest,
    @Body(new ZodPipe(adminNewsletterCampaignInput)) input: z.infer<typeof adminNewsletterCampaignInput>,
  ) {
    return this.newsletter.createCampaign(req.auth.user, input, req.ip);
  }
}
