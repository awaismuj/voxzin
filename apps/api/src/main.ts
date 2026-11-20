import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // behind Nginx/Cloudflare; adjust when the proxy chain is final
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { extended: false, limit: '1kb' });
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true, methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE'], maxAge: 600 });
  app.enableShutdownHooks();
  await app.listen(env.API_PORT, '0.0.0.0');
}
void bootstrap();
