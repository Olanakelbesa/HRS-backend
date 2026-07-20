import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RecommendationService } from './recommendation.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { interactionSchema, searchSchema } from './schema';
import {
  exportParamsSchema,
  exportQuerySchema,
  historyQuerySchema,
  likePropertySchema,
  propertyStateParamsSchema,
  recordContactSchema,
  recordScheduleSchema,
  recordShareSchema,
  recordViewSchema,
  savePropertySchema,
} from '../interactions/schema';
import type { z } from 'zod';

type SearchInput = z.infer<typeof searchSchema>;
type InteractionInput = z.infer<typeof interactionSchema>;
type RecordViewInput = z.infer<typeof recordViewSchema>;
type LikeInput = z.infer<typeof likePropertySchema>;
type SaveInput = z.infer<typeof savePropertySchema>;
type ContactInput = z.infer<typeof recordContactSchema>;
type ShareInput = z.infer<typeof recordShareSchema>;
type ScheduleInput = z.infer<typeof recordScheduleSchema>;
type HistoryQuery = z.infer<typeof historyQuerySchema>;
type ExportQuery = z.infer<typeof exportQuerySchema>;

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  async getRecommendations(@CurrentUser() user: AuthUser) {
    const data = await this.recommendationService.getRecommendationsFormatted(user.userId);
    return {
      status: 'success',
      message: 'Recommendations fetched successfully',
      data,
    };
  }

  @Get('similar/:propertyId')
  async getSimilarProperties(@Param('propertyId') propertyId: string) {
    const data = await this.recommendationService.getSimilarProperties(propertyId);
    return { status: 'success', data };
  }

  @Post('interactions')
  @UsePipes(new ZodValidationPipe(interactionSchema, 'body'))
  async trackInteraction(
    @CurrentUser() user: AuthUser,
    @Body() body: InteractionInput,
    @Res() res: Response,
  ) {
    const result = await this.recommendationService.trackInteraction(
      user.userId,
      body.propertyId,
      body.type,
    );
    // Legacy trackInteraction returns interaction mutation result { statusCode, body }
    if (
      result &&
      typeof result === 'object' &&
      'statusCode' in result &&
      'body' in result
    ) {
      const mutation = result as { statusCode: number; body: unknown };
      return res.status(mutation.statusCode).json(mutation.body);
    }
    return res.status(200).json(result);
  }

  @Post('interactions/view')
  async recordView(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(recordViewSchema, 'body')) body: RecordViewInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.recordView(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Post('interactions/like')
  async likeProperty(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(likePropertySchema, 'body')) body: LikeInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.likeProperty(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Delete('interactions/like')
  async unlikeProperty(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(likePropertySchema, 'body')) body: LikeInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.unlikeProperty(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Post('interactions/save')
  async saveProperty(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(savePropertySchema, 'body')) body: SaveInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.saveProperty(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Delete('interactions/save')
  async unsaveProperty(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(savePropertySchema, 'body')) body: SaveInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.unsaveProperty(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Post('interactions/contact')
  async recordContact(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(recordContactSchema, 'body')) body: ContactInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.recordContact(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Post('interactions/share')
  async recordShare(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(recordShareSchema, 'body')) body: ShareInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.recordShare(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Post('interactions/schedule')
  async recordSchedule(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(recordScheduleSchema, 'body')) body: ScheduleInput,
    @Res() res: Response,
  ) {
    const source = this.recommendationService.validateSource(body.source);
    const result = await this.recommendationService.recordSchedule(user.userId, {
      ...body,
      source,
    });
    return res.status(result.statusCode).json(result.body);
  }

  @Get('interactions/property/:propertyId/state')
  async getPropertyState(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(propertyStateParamsSchema, 'params'))
    params: z.infer<typeof propertyStateParamsSchema>,
  ) {
    return this.recommendationService.getPropertyState(user.userId, params.propertyId);
  }

  @Get('interactions/history')
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(historyQuerySchema, 'query')) query: HistoryQuery,
  ) {
    return this.recommendationService.getHistory(user.userId, query);
  }

  @Public()
  @UseGuards(ServiceAuthGuard)
  @Get('interactions/export/user/:userId')
  async exportUserEvents(
    @Param(new ZodValidationPipe(exportParamsSchema, 'params'))
    params: z.infer<typeof exportParamsSchema>,
    @Query(new ZodValidationPipe(exportQuerySchema, 'query')) query: ExportQuery,
  ) {
    return this.recommendationService.exportUserEvents(params.userId, query.after);
  }

  @Post('search-history')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(searchSchema, 'body'))
  async saveSearch(@CurrentUser() user: AuthUser, @Body() body: SearchInput) {
    const data = await this.recommendationService.saveSearch(
      user.userId,
      body.query,
      body.filters,
    );
    return { status: 'success', data };
  }

  @Get('search-history')
  async getSearchHistory(@CurrentUser() user: AuthUser) {
    const data = await this.recommendationService.getSearchHistory(user.userId);
    return { status: 'success', data };
  }
}
