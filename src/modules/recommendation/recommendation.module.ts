import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationApiService } from './recommendation.api.service';

@Module({
  controllers: [RecommendationController],
  providers: [RecommendationApiService],
  exports: [RecommendationApiService],
})
export class RecommendationsModule {}
