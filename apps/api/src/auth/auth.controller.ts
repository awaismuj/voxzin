import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { inviteAcceptInput, loginInput, mfaCodeInput, passwordResetConfirmInput, passwordResetRequestInput } from '@voxzin/shared';
import { ZodPipe } from '../common/zod.pipe';
import type { AuthedRequest } from '../common/types';
import { env } from '../config/env';
import { AuthService, publicUser, SESSION_COOKIE } from './auth.service';
import { SessionGuard } from './guards';

const cookieOpts = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body(new ZodPipe(loginInput)) body: { email: string; password: string },
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, expiresAt, user } = await this.auth.login(body.email, body.password, req.ip, req.headers['user-agent']);
    res.cookie(SESSION_COOKIE, token, { ...cookieOpts, expires: expiresAt });
    return user;
  }

  @Post('invitations/accept')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async acceptInvitation(@Body(new ZodPipe(inviteAcceptInput)) body: { token: string; password: string }) {
    await this.auth.acceptInvite(body.token, body.password);
  }

  @Post('password-reset/request')
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestPasswordReset(@Body(new ZodPipe(passwordResetRequestInput)) body: { email: string }, @Req() req: AuthedRequest) {
    await this.auth.requestPasswordReset(body.email, req.ip);
  }

  @Post('password-reset/confirm')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmPasswordReset(@Body(new ZodPipe(passwordResetConfirmInput)) body: { token: string; password: string }, @Req() req: AuthedRequest) {
    await this.auth.resetPassword(body.token, body.password, req.ip);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string') await this.auth.logout(token);
    res.clearCookie(SESSION_COOKIE, cookieOpts);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: AuthedRequest) {
    return publicUser(req.auth.user, req.auth.session.mfaVerified);
  }

  @Post('mfa/setup')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  setup(@Req() req: AuthedRequest) {
    return this.auth.mfaSetup(req.auth.user);
  }

  @Post('mfa/enable')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async enable(@Body(new ZodPipe(mfaCodeInput)) body: { code: string }, @Req() req: AuthedRequest) {
    await this.auth.mfaEnable(req.auth.user, req.auth.session, body.code, req.ip);
  }

  @Post('mfa/verify')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verify(@Body(new ZodPipe(mfaCodeInput)) body: { code: string }, @Req() req: AuthedRequest) {
    await this.auth.mfaVerify(req.auth.user, req.auth.session, body.code, req.ip);
  }
}
