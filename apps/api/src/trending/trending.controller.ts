import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  countryCodeSchema, objectIdSchema, slugSchema, trendAdminQuery, trendCreateInput, trendListQuery, trendPatchInput,
} from '@voxzin/shared';
import { z } from 'zod';
import { Roles, RolesGuard, SessionGuard } from '../auth/guards';
import type { AuthedRequest } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { TrendingService } from './trending.service';

const slugParam = new ZodPipe(slugSchema);

@Controller('trending')
export class TrendingController {
  constructor(private readonly s: TrendingService) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
  list(@Query(new ZodPipe(trendListQuery)) q: z.infer<typeof trendListQuery>) {
    return this.s.list(q);
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
  get(@Param('slug', slugParam) slug: string, @Query('country', new ZodPipe(countryCodeSchema.optional())) country?: string) {
    return this.s.getBySlug(slug, country);
  }
}

@Controller('admin/trending')
@UseGuards(SessionGuard, RolesGuard)
@Roles('super_admin', 'admin', 'editor')
export class TrendingAdminController {
  constructor(private readonly s: TrendingService) {}

  @Get()
  list(@Query(new ZodPipe(trendAdminQuery)) q: z.infer<typeof trendAdminQuery>) {
    return this.s.adminList(q);
  }
  @Post()
  create(@Req() r: AuthedRequest, @Body(new ZodPipe(trendCreateInput)) b: z.infer<typeof trendCreateInput>) {
    return this.s.create(r.auth.user, b);
  }
  @Patch(':id')
  patch(@Req() r: AuthedRequest, @Param('id', new ZodPipe(objectIdSchema)) id: string, @Body(new ZodPipe(trendPatchInput)) b: z.infer<typeof trendPatchInput>) {
    return this.s.patch(r.auth.user, id, b, r.ip);
  }
}
