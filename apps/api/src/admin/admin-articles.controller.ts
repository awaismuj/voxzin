import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminArticleTagSuggestionsQuery, adminArticlesQuery, articleInput, articlePatchInput, objectIdSchema, transitionInput,
  type ArticleInput, type ArticlePatchInput, type ArticleStatus,
} from '@voxzin/shared';
import { z } from 'zod';
import { RolesGuard, Roles, SessionGuard } from '../auth/guards';
import type { AuthedRequest } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { AdminArticlesService } from './admin-articles.service';

const id = new ZodPipe(objectIdSchema);

@Controller('admin/articles')
@UseGuards(SessionGuard, RolesGuard)
@Roles('super_admin', 'admin', 'editor', 'author')
export class AdminArticlesController {
  constructor(private readonly service: AdminArticlesService) {}

  @Get()
  list(@Req() req: AuthedRequest, @Query(new ZodPipe(adminArticlesQuery)) q: z.infer<typeof adminArticlesQuery>) {
    return this.service.list(req.auth.user, q);
  }

  @Get('tag-suggestions')
  tagSuggestions(@Query(new ZodPipe(adminArticleTagSuggestionsQuery)) q: z.infer<typeof adminArticleTagSuggestionsQuery>) {
    return this.service.suggestTags(q.q);
  }

  @Get(':id')
  get(@Req() req: AuthedRequest, @Param('id', id) articleId: string) {
    return this.service.get(req.auth.user, articleId);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body(new ZodPipe(articleInput)) body: ArticleInput) {
    return this.service.create(req.auth.user, body, req.ip);
  }

  @Patch(':id')
  update(@Req() req: AuthedRequest, @Param('id', id) articleId: string, @Body(new ZodPipe(articlePatchInput)) body: ArticlePatchInput) {
    return this.service.update(req.auth.user, articleId, body, req.ip);
  }

  @Post(':id/transition')
  @HttpCode(200)
  transition(
    @Req() req: AuthedRequest,
    @Param('id', id) articleId: string,
    @Body(new ZodPipe(transitionInput)) body: { status: ArticleStatus; scheduledAt?: Date },
  ) {
    return this.service.transition(req.auth.user, articleId, body.status, body.scheduledAt, req.ip);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(
    @Req() req: AuthedRequest,
    @Param('id', id) articleId: string,
    @Body(new ZodPipe(articlePatchInput)) body: ArticlePatchInput,
  ) {
    return this.service.publish(req.auth.user, articleId, body, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('super_admin', 'admin')
  remove(@Req() req: AuthedRequest, @Param('id', id) articleId: string) {
    return this.service.remove(req.auth.user, articleId, req.ip);
  }
}
