import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminRecommendationsService } from './admin-recommendations.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminRecommendationsController {
  constructor(
    private readonly recommendationsService: AdminRecommendationsService,
  ) {}

  @Post('recommendations/train')
  async triggerTraining() {
    const data = await this.recommendationsService.triggerTraining();
    return { status: 'success', data };
  }

  @Get('recommendations/analytics')
  async analytics() {
    const data = await this.recommendationsService.getAnalytics();
    return { status: 'success', data };
  }

  @Get('recommendations/history')
  async history(@Query('limit') limit?: string) {
    const data = await this.recommendationsService.getTrainingHistory(
      limit ? Number(limit) : 10,
    );
    return { status: 'success', data };
  }
}
