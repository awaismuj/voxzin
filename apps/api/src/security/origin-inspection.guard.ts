import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { OriginGuardService } from './origin-guard.service';

@Injectable()
export class OriginInspectionGuard implements CanActivate {
  constructor(private readonly originGuard: OriginGuardService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const sourceIp = request.ip || request.socket.remoteAddress || 'unknown';
    if (this.originGuard.inspectRequest(sourceIp, request.method, request.path)) {
      throw new ForbiddenException('Request blocked by security inspection');
    }
    return true;
  }
}
