import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MODELS } from '@voxzin/database';
import { env } from './config/env';
import { AdminArticlesController } from './admin/admin-articles.controller';
import { AdminArticlesService } from './admin/admin-articles.service';
import { CatalogController } from './admin/catalog.controller';
import { CatalogService } from './admin/catalog.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { ArticlesController } from './articles/articles.controller';
import { ArticlesService } from './articles/articles.service';
import { AdminFeedbackController, ArticleFeedbackController } from './feedback/feedback.controller';
import { FeedbackService } from './feedback/feedback.service';
import { IndexNowService } from './seo/indexnow.service';
import { AdminBootstrapService } from './auth/admin-bootstrap.service';
import { AuditService } from './auth/audit.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { OriginGuard, RolesGuard, SessionGuard } from './auth/guards';
import { CategoriesController, CountriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { HealthController } from './health/health.controller';
import { MediaController } from './media/media.controller';
import { MailService } from './newsletter/mail.service';
import { NewsletterController } from './newsletter/newsletter.controller';
import { AdminNewsletterController } from './newsletter/admin-newsletter.controller';
import { AdminNewsletterService } from './newsletter/admin-newsletter.service';
import { SiteController } from './site/site.controller';
import { OriginInspectionGuard } from './security/origin-inspection.guard';
import { OriginGuardService } from './security/origin-guard.service';
import { SecurityController } from './security/security.controller';
import { TrendingAdminController, TrendingController } from './trending/trending.controller';
import { TrendingService } from './trending/trending.service';

@Module({
  imports: [
    MongooseModule.forRoot(env.MONGODB_URI, { maxPoolSize: 20, serverSelectionTimeoutMS: 5000 }),
    MongooseModule.forFeature(Object.entries(MODELS).map(([name, schema]) => ({ name, schema }))),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [
    ArticlesController, CategoriesController, HealthController, AuthController, AdminArticlesController,
    CatalogController, AiController, MediaController, TrendingController, TrendingAdminController,
    NewsletterController, AdminNewsletterController, SiteController, CountriesController, SecurityController,
    ArticleFeedbackController, AdminFeedbackController,
  ],
  providers: [
    ArticlesService, CategoriesService, AuthService, AuditService, AdminArticlesService, CatalogService,
    AiService, TrendingService, FeedbackService, AdminNewsletterService, MailService, SessionGuard, RolesGuard, AdminBootstrapService, IndexNowService,
    OriginGuardService, OriginInspectionGuard,
    { provide: APP_GUARD, useClass: OriginInspectionGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
})
export class AppModule {}
