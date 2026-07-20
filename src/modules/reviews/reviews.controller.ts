import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReviewsService } from './reviews.service';
import {
  createReviewSchema,
  updateReviewSchema,
  replyReviewSchema,
} from '../review-rate/schema';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth()
  @Post()
  @UsePipes(new ZodValidationPipe(createReviewSchema, 'body'))
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { propertyId: string; rating: number; comment?: string },
  ) {
    const review = await this.reviewsService.createReview(
      user.userId,
      body.propertyId,
      body.rating,
      body.comment,
    );
    return review;
  }

  @Public()
  @Get('property/:propertyId/stats')
  async propertyStats(@Param('propertyId') propertyId: string) {
    return this.reviewsService.getPropertyReviewStats(propertyId);
  }

  @Public()
  @Get('property/:propertyId')
  async propertyReviews(@Param('propertyId') propertyId: string) {
    return this.reviewsService.getPropertyReviews(propertyId);
  }

  @ApiBearerAuth()
  @Get('me')
  async myReviews(@CurrentUser() user: AuthUser) {
    return this.reviewsService.getUserReviews(user.userId);
  }

  @ApiBearerAuth()
  @Roles('owner', 'admin')
  @Get('owner/stats')
  async ownerStats(@CurrentUser() user: AuthUser) {
    return this.reviewsService.getOwnerReviewStats(user.userId);
  }

  @ApiBearerAuth()
  @Roles('owner', 'admin')
  @Get('owner')
  async ownerReviews(
    @CurrentUser() user: AuthUser,
    @Query('rating') rating?: string,
    @Query('sort') sort?: 'newest' | 'oldest',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getOwnerReviews(user.userId, {
      rating: rating ? Number(rating) : undefined,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiBearerAuth()
  @Patch(':reviewId/reply')
  @Roles('owner', 'admin')
  @UsePipes(new ZodValidationPipe(replyReviewSchema, 'body'))
  async reply(
    @CurrentUser() user: AuthUser,
    @Param('reviewId') reviewId: string,
    @Body() body: { reply: string },
  ) {
    const review = (await this.reviewsService.replyToReview(
      reviewId,
      user.userId,
      body.reply.trim(),
    )) as {
      id: string;
      rating: number;
      comment: string | null;
      reply: string | null;
      repliedAt: Date | null;
      propertyId: string;
      property?: { title?: unknown };
    };

    return {
      reviewId: review.id,
      rating: review.rating,
      comment: review.comment,
      reply: review.reply,
      repliedAt: review.repliedAt,
      propertyId: review.propertyId,
      propertyTitle: review.property?.title,
    };
  }

  @ApiBearerAuth()
  @Patch(':reviewId')
  @UsePipes(new ZodValidationPipe(updateReviewSchema, 'body'))
  async update(
    @CurrentUser() user: AuthUser,
    @Param('reviewId') reviewId: string,
    @Body() body: { rating?: number; comment?: string },
  ) {
    return this.reviewsService.updateReview(
      reviewId,
      user.userId,
      body.rating,
      body.comment,
    );
  }

  @ApiBearerAuth()
  @Delete(':reviewId')
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser, @Param('reviewId') reviewId: string) {
    await this.reviewsService.deleteReview(reviewId, user.userId);
    return { status: 'success', message: 'Review deleted successfully' };
  }
}
