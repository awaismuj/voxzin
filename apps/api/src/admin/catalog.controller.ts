import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { authorInput, categoryInput, countryInput, objectIdSchema, settingsInput, userInviteInput, userPatchInput } from '@voxzin/shared';
import { z } from 'zod';
import { Roles, RolesGuard, SessionGuard } from '../auth/guards';
import type { AuthedRequest } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { CatalogService } from './catalog.service';

const id = new ZodPipe(objectIdSchema);

@Controller('admin')
@UseGuards(SessionGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly s: CatalogService) {}

  @Get('stats') @Roles('super_admin', 'admin', 'editor')
  stats() { return this.s.stats(); }

  @Get('seo/overview') @Roles('super_admin', 'admin', 'editor')
  seoOverview() { return this.s.seoOverview(); }

  // Lookups every writer needs (read only)
  @Get('categories') @Roles('super_admin', 'admin', 'editor', 'author')
  categories() { return this.s.listCategories(); }
  @Get('authors') @Roles('super_admin', 'admin', 'editor', 'author')
  authors() { return this.s.listAuthors(); }

  @Post('categories') @Roles('super_admin', 'admin')
  createCategory(@Req() r: AuthedRequest, @Body(new ZodPipe(categoryInput)) b: z.infer<typeof categoryInput>) { return this.s.saveCategory(r.auth.user, b); }
  @Patch('categories/:id') @Roles('super_admin', 'admin')
  updateCategory(@Req() r: AuthedRequest, @Param('id', id) i: string, @Body(new ZodPipe(categoryInput)) b: z.infer<typeof categoryInput>) { return this.s.saveCategory(r.auth.user, b, i); }
  @Delete('categories/:id') @HttpCode(204) @Roles('super_admin', 'admin')
  deleteCategory(@Req() r: AuthedRequest, @Param('id', id) i: string) { return this.s.deleteCategory(r.auth.user, i); }

  @Get('countries') @Roles('super_admin', 'admin')
  countries() { return this.s.listCountries(); }
  @Post('countries') @Roles('super_admin', 'admin')
  createCountry(@Req() r: AuthedRequest, @Body(new ZodPipe(countryInput)) b: z.infer<typeof countryInput>) { return this.s.saveCountry(r.auth.user, b); }
  @Patch('countries/:id') @Roles('super_admin', 'admin')
  updateCountry(@Req() r: AuthedRequest, @Param('id', id) i: string, @Body(new ZodPipe(countryInput)) b: z.infer<typeof countryInput>) { return this.s.saveCountry(r.auth.user, b, i); }

  @Post('authors') @Roles('super_admin', 'admin')
  createAuthor(@Req() r: AuthedRequest, @Body(new ZodPipe(authorInput)) b: z.infer<typeof authorInput>) { return this.s.saveAuthor(r.auth.user, b); }
  @Patch('authors/:id') @Roles('super_admin', 'admin')
  updateAuthor(@Req() r: AuthedRequest, @Param('id', id) i: string, @Body(new ZodPipe(authorInput)) b: z.infer<typeof authorInput>) { return this.s.saveAuthor(r.auth.user, b, i); }

  @Get('users') @Roles('super_admin', 'admin')
  users() { return this.s.listUsers(); }
  @Post('users') @Roles('super_admin', 'admin')
  createUser(@Req() r: AuthedRequest, @Body(new ZodPipe(userInviteInput)) b: z.infer<typeof userInviteInput>) { return this.s.createUser(r.auth.user, b, r.ip); }
  @Post('users/:id/invite') @HttpCode(204) @Roles('super_admin', 'admin')
  resendInvite(@Req() r: AuthedRequest, @Param('id', id) i: string) { return this.s.resendInvite(r.auth.user, i, r.ip); }
  @Patch('users/:id') @Roles('super_admin', 'admin')
  patchUser(@Req() r: AuthedRequest, @Param('id', id) i: string, @Body(new ZodPipe(userPatchInput)) b: z.infer<typeof userPatchInput>) { return this.s.patchUser(r.auth.user, i, b, r.ip); }
  @Post('users/:id/revoke-sessions') @HttpCode(204) @Roles('super_admin', 'admin')
  revoke(@Req() r: AuthedRequest, @Param('id', id) i: string) { return this.s.revokeSessions(r.auth.user, i, r.ip); }
  @Post('users/:id/reset-mfa') @HttpCode(204) @Roles('super_admin')
  resetMfa(@Req() r: AuthedRequest, @Param('id', id) i: string) { return this.s.resetMfa(r.auth.user, i, r.ip); }

  @Get('settings') @Roles('super_admin', 'admin')
  settings() { return this.s.getSettings(); }
  @Put('settings') @Roles('super_admin', 'admin')
  saveSettings(@Req() r: AuthedRequest, @Body(new ZodPipe(settingsInput)) b: z.infer<typeof settingsInput>) { return this.s.saveSettings(r.auth.user, b); }
}
