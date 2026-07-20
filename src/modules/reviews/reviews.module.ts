import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsApiService } from './reviews.api.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsApiService],
  exports: [ReviewsApiService],
})
export class ReviewsModule {}
