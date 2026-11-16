import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PRIVILEGED_ROLES, type Role } from '@voxzin/shared';
import type { AuthedRequest } from '../common/types';
import { env } from '../config/env';
import { AuthService, SESSION_COOKIE } from './auth.service';

/** Resolves the session cookie into req.auth. Does NOT enforce MFA (auth endpoints need that). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length === 0 || token.length > 200) throw new UnauthorizedException();
    const resolved = await this.auth.resolve(token);
    if (!resolved) throw new UnauthorizedException();
    req.auth = resolved;
    return true;
  }
}

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

/** Server-side RBAC plus mandatory MFA for privileged roles. Use after SessionGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>('roles', [ctx.getHandler(), ctx.getClass()]);
    const { user, session } = ctx.switchToHttp().getRequest<AuthedRequest>().auth;
    if (roles && roles.length > 0 && !roles.includes(user.role)) throw new ForbiddenException('Not allowed');
    if (PRIVILEGED_ROLES.includes(user.role) && !session.mfaVerified) throw new ForbiddenException('MFA required');
    return true;
  }
}

/** CSRF defence for cookie auth: state-changing requests must come from an allowed origin. */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    let origin = req.headers.origin;
    if (!origin && req.headers.referer) {
      try {
        origin = new URL(req.headers.referer).origin;
      } catch {
        origin = undefined;
      }
    }
    if (!origin || !env.CORS_ORIGINS.includes(origin)) throw new ForbiddenException('Origin not allowed');
    return true;
  }
}
