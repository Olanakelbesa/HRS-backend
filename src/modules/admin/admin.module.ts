import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminPropertiesController } from './admin-properties.controller';
import { AdminPropertiesService } from './admin-properties.service';
import { AdminAgreementsController } from './admin-agreements.controller';
import { AdminAgreementsService } from './admin-agreements.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReviewsService } from './admin-reviews.service';
import { AdminRecommendationsController } from './admin-recommendations.controller';
import { AdminRecommendationsService } from './admin-recommendations.service';
import { AdminEmbeddingsController } from './admin-embeddings.controller';
import { AdminEmbeddingsService } from './admin-embeddings.service';

@Module({
  controllers: [
    AdminAnalyticsController,
    AdminUsersController,
    AdminPropertiesController,
    AdminAgreementsController,
    AdminReportsController,
    AdminReviewsController,
    AdminRecommendationsController,
    AdminEmbeddingsController,
  ],
  providers: [
    AdminAnalyticsService,
    AdminUsersService,
    AdminPropertiesService,
    AdminAgreementsService,
    AdminReportsService,
    AdminReviewsService,
    AdminRecommendationsService,
    AdminEmbeddingsService,
  ],
})
export class AdminModule {}
