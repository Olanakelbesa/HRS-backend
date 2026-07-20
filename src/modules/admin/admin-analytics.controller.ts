import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminAnalyticsService } from './admin-analytics.service';
import {
  getAnalyticsQuerySchema,
  getAuditLogsQuerySchema,
  getOverviewQuerySchema,
  type GetAnalyticsQueryInput,
  type GetAuditLogsQueryInput,
  type GetOverviewQueryInput,
} from './schema';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('analytics')
  @UsePipes(new ZodValidationPipe(getAnalyticsQuerySchema, 'query'))
  async analytics(@Query() query: GetAnalyticsQueryInput) {
    const data = await this.analyticsService.getPlatformAnalytics(query.range);
    return { status: 'success', data };
  }

  @Get('overview')
  @UsePipes(new ZodValidationPipe(getOverviewQuerySchema, 'query'))
  async overview(@Query() query: GetOverviewQueryInput) {
    const data = await this.analyticsService.getOverview(query);
    return { status: 'success', message: 'Overview loaded', data };
  }

  @Get('audit-logs')
  @UsePipes(new ZodValidationPipe(getAuditLogsQuerySchema, 'query'))
  async auditLogs(@Query() query: GetAuditLogsQueryInput) {
    const data = await this.analyticsService.getAuditLogs(query);
    return { status: 'success', data };
  }
}
