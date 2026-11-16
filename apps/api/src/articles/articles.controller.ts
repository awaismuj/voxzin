import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { listArticlesQuery, searchQuery, slugSchema, type ListArticlesQuery } from '@voxzin/shared';
import type { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { ArticlesService } from './articles.service';

const CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

@Controller()
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get('home')
  @Header('Cache-Control', CACHE)
  home() {
    return this.service.home();
  }

  @Get('articles')
  @Header('Cache-Control', CACHE)
  list(@Query(new ZodPipe(listArticlesQuery)) query: ListArticlesQuery) {
    return this.service.list(query);
  }

  @Get('search')
  @Header('Cache-Control', 'public, s-maxage=30')
  search(@Query(new ZodPipe(searchQuery)) query: z.infer<typeof searchQuery>) {
    return this.service.search(query);
  }

  @Get('articles/:slug')
  @Header('Cache-Control', CACHE)
  get(@Param('slug', new ZodPipe(slugSchema)) slug: string) {
    return this.service.getBySlug(slug);
  }
}
