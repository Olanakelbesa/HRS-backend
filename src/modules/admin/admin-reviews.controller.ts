import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminReviewsService } from './admin-reviews.service';
import {
  paginationQuerySchema,
  paramIdSchema,
  updateReviewStatusSchema,
} from './schema';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminReviewsController {
  constructor(private readonly reviewsService: AdminReviewsService) {}

  @Get('reviews')
  @UsePipes(new ZodValidationPipe(paginationQuerySchema, 'query'))
  async list(
    @Query() query: { page: number; limit: number; search?: string },
  ) {
    const data = await this.reviewsService.getReviews(query);
    return { status: 'success', data };
  }

  @Patch('reviews/:id/status')
  @UsePipes(new ZodValidationPipe(updateReviewStatusSchema, 'body'))
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    paramIdSchema.parse({ id });
    const data = await this.reviewsService.updateReviewStatus(
      user.userId,
      id,
      body.status,
    );
    return { status: 'success', data };
  }

  @Delete('reviews/:id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.reviewsService.deleteReview(user.userId, id);
    return { status: 'success', data };
  }
}
