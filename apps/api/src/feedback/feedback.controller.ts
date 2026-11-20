import {
  Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  adminArticleFeedbackQuery,
  articleFeedbackInput,
  articleFeedbackListQuery,
  articleFeedbackPatchInput,
  objectIdSchema,
  slugSchema,
} from '@voxzin/shared';
import type { z } from 'zod';
import { Roles, RolesGuard, SessionGuard } from '../auth/guards';
import type { AuthedRequest } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { FeedbackService } from './feedback.service';

const publicCache = 'public, s-maxage=30, stale-while-revalidate=120';

@Controller()
export class ArticleFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get('feedback/home')
  @Header('Cache-Control', publicCache)
  homepage() {
    return this.feedback.homepage();
  }

  @Get('articles/:slug/feedback')
  @Header('Cache-Control', publicCache)
  forArticle(
    @Param('slug', new ZodPipe(slugSchema)) slug: string,
    @Query(new ZodPipe(articleFeedbackListQuery)) query: z.infer<typeof articleFeedbackListQuery>,
  ) {
    return this.feedback.forArticle(slug, query);
  }

  @Post('articles/:slug/feedback')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(
    @Param('slug', new ZodPipe(slugSchema)) slug: string,
    @Body(new ZodPipe(articleFeedbackInput)) input: z.infer<typeof articleFeedbackInput>,
  ) {
    return this.feedback.submit(slug, input);
  }
}

@Controller('admin/feedback')
@UseGuards(SessionGuard, RolesGuard)
@Roles('super_admin', 'admin', 'editor')
export class AdminFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  list(@Query(new ZodPipe(adminArticleFeedbackQuery)) query: z.infer<typeof adminArticleFeedbackQuery>) {
    return this.feedback.adminList(query);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id', new ZodPipe(objectIdSchema)) id: string,
    @Body(new ZodPipe(articleFeedbackPatchInput)) input: z.infer<typeof articleFeedbackPatchInput>,
  ) {
    return this.feedback.update(req.auth.user, id, input, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: AuthedRequest, @Param('id', new ZodPipe(objectIdSchema)) id: string) {
    return this.feedback.remove(req.auth.user, id, req.ip);
  }
}
