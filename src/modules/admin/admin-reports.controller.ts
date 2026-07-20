import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminReportsService } from './admin-reports.service';
import {
  paginationQuerySchema,
  paramIdSchema,
  updateReportStatusSchema,
} from './schema';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('reports')
  @UsePipes(new ZodValidationPipe(paginationQuerySchema, 'query'))
  async list(
    @Query() query: { page: number; limit: number; search?: string },
  ) {
    const data = await this.reportsService.getReports(query);
    return { status: 'success', data };
  }

  @Get('reports/:id/risk-assessment')
  async riskAssessment(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.reportsService.getReportRiskAssessment(id);
    if (!data) throw new NotFoundException('Report not found');
    return { status: 'success', data };
  }

  @Get('reports/:id')
  async get(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.reportsService.getReportById(id);
    if (!data) throw new NotFoundException('Not found');
    return { status: 'success', data };
  }

  @Patch('reports/:id/status')
  @UsePipes(new ZodValidationPipe(updateReportStatusSchema, 'body'))
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    paramIdSchema.parse({ id });
    const data = await this.reportsService.updateReportStatus(
      user.userId,
      id,
      body.status,
    );
    return { status: 'success', data };
  }
}
