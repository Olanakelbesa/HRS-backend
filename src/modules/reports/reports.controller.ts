import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ReportsService } from './reports.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  getOwnerReportsQuerySchema,
  submitOwnerResponseSchema,
  submitReportSchema,
  type GetOwnerReportsQueryInput,
  type SubmitOwnerResponseInput,
  type SubmitReportInput,
} from './schema';

const REPORT_IMAGE_UPLOAD = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles('renter')
  @UseInterceptors(FilesInterceptor('images', 10, { storage: memoryStorage() }))
  @UsePipes(new ZodValidationPipe(submitReportSchema, 'body'))
  async submit(
    @CurrentUser() user: AuthUser,
    @Body() body: SubmitReportInput,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const report = await this.reportsService.createReport(user.userId, body, files);
    return { status: 'success', data: report };
  }

  @Get()
  @Roles('owner', 'admin')
  @UsePipes(new ZodValidationPipe(getOwnerReportsQuerySchema, 'query'))
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: GetOwnerReportsQueryInput,
  ) {
    const result = await this.reportsService.getReportsAgainstOwner(user.userId, query);
    return { status: 'success', ...result };
  }

  @Get(':reportId')
  @Roles('owner', 'admin')
  async getOne(
    @CurrentUser() user: AuthUser,
    @Param('reportId') reportId: string,
  ) {
    const report = await this.reportsService.getOwnerReportById(user.userId, reportId);
    return { status: 'success', data: report };
  }

  @Post(':reportId/response')
  @Roles('owner', 'admin')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(submitOwnerResponseSchema, 'body'))
  async respond(
    @CurrentUser() user: AuthUser,
    @Param('reportId') reportId: string,
    @Body() body: SubmitOwnerResponseInput,
  ) {
    const data = await this.reportsService.submitOwnerResponse(
      user.userId,
      reportId,
      body.response,
    );
    return {
      status: 'success',
      message: 'Response submitted successfully',
      data,
    };
  }
}
