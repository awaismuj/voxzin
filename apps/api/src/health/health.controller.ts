import { Controller, Get, Header } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  check() {
    const dbUp = this.conn.readyState === 1;
    return { status: dbUp ? 'ok' : 'degraded', database: dbUp ? 'up' : 'down' };
  }
}
