import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard, SessionGuard } from '../auth/guards';
import { OriginGuardService } from './origin-guard.service';

@Controller('admin/security')
@UseGuards(SessionGuard, RolesGuard)
@Roles('super_admin', 'admin')
export class SecurityController {
  constructor(private readonly originGuard: OriginGuardService) {}

  @Get('overview')
  @Header('Cache-Control', 'no-store')
  overview() {
    return this.originGuard.overview();
  }
}
