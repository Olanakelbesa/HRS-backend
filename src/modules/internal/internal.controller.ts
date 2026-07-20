import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';
import { InternalService } from './internal.service';

@ApiTags('Internal')
@Public()
@UseGuards(ServiceAuthGuard)
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('recommendation-data')
  async getRecommendationData() {
    try {
      return await this.internalService.getRecommendationData();
    } catch {
      throw new HttpException(
        { error: 'Internal server error during data export' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
