import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { PropertiesService } from './properties.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createPropertySchema,
  updatePropertySchema,
  updatePropertyStatusSchema,
  getPropertiesSchema,
  getNearbyPropertiesSchema,
  getSimilarPropertiesSchema,
  type CreatePropertyInput,
  type UpdatePropertyInput,
  type UpdatePropertyStatusInput,
  type GetPropertiesQueryInput,
  type GetNearbyPropertiesQueryInput,
  type GetSimilarPropertiesQueryInput,
} from './schema';

const PROPERTY_UPLOAD = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};

function resolveLanguage(
  queryLang?: string,
  acceptLanguage?: string | string[],
): 'en' | 'am' {
  if (queryLang === 'en' || queryLang === 'am') return queryLang;
  const raw = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  const normalized = raw?.split(',')[0]?.split('-')[0]?.toLowerCase();
  return normalized === 'am' ? 'am' : 'en';
}

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get()
  @UsePipes(new ZodValidationPipe(getPropertiesSchema, 'query'))
  async list(
    @Query() query: GetPropertiesQueryInput,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const language = resolveLanguage(query.lang, acceptLanguage);
    const result = await this.propertiesService.getProperties(query, language);
    return {
      status: 'success',
      message: 'Properties fetched successfully',
      data: result.properties,
      meta: result.meta,
    };
  }

  @ApiBearerAuth()
  @Get('my')
  async getMy(@CurrentUser() user: AuthUser) {
    const properties = await this.propertiesService.getMyProperties(user.userId);
    return {
      status: 'success',
      message: 'Owner properties fetched successfully',
      data: properties,
    };
  }

  @ApiBearerAuth()
  @Get('saved')
  async getSaved(@CurrentUser() user: AuthUser) {
    const saved = await this.propertiesService.getSavedProperties(user.userId);
    return {
      status: 'success',
      message: 'Saved properties fetched successfully',
      data: saved,
    };
  }

  @Public()
  @Get('nearby')
  @UsePipes(new ZodValidationPipe(getNearbyPropertiesSchema, 'query'))
  async nearby(@Query() query: GetNearbyPropertiesQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;
    const radius = Number(query.radius) || 10;
    const result = await this.propertiesService.getNearbyProperties(
      query.lat,
      query.lng,
      radius,
      page,
      limit,
      query.status,
      query.category,
    );
    return {
      status: 'success',
      message: 'Nearby properties fetched successfully',
      data: result.properties,
      meta: result.meta,
    };
  }

  @ApiBearerAuth()
  @Get('analytics')
  async analytics(@CurrentUser() user: AuthUser) {
    const analytics = await this.propertiesService.getOwnerPropertyAnalytics(user.userId);
    return {
      status: 'success',
      message: 'Property analytics fetched successfully',
      data: analytics,
    };
  }

  @Public()
  @Get(':propertyId/similar')
  async similar(
    @Param('propertyId') propertyId: string,
    @Query(new ZodValidationPipe(getSimilarPropertiesSchema, 'query'))
    query: GetSimilarPropertiesQueryInput,
  ) {
    const similar = await this.propertiesService.getSimilarProperties(
      propertyId,
      Number(query.limit) || 12,
    );
    return {
      status: 'success',
      message: 'Similar properties fetched successfully',
      data: similar,
    };
  }

  @ApiBearerAuth()
  @Post(':propertyId/save')
  @HttpCode(200)
  async save(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    const saved = await this.propertiesService.saveProperty(user.userId, propertyId);
    return { status: 'success', message: 'Property saved successfully', data: saved };
  }

  @ApiBearerAuth()
  @Delete(':propertyId/save')
  async unsave(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    await this.propertiesService.removeSavedProperty(user.userId, propertyId);
    return { status: 'success', message: 'Property removed from saved list successfully' };
  }

  @Public()
  @Get(':propertyId')
  async getById(
    @Param('propertyId') propertyId: string,
    @Query('lang') lang: string | undefined,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @CurrentUser() user?: AuthUser,
  ) {
    const language = resolveLanguage(lang, acceptLanguage);
    const property = await this.propertiesService.getPropertyById(
      propertyId,
      language,
      user?.userId,
    );
    return {
      status: 'success',
      message: 'Property fetched successfully',
      data: property,
    };
  }

  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
      ],
      PROPERTY_UPLOAD,
    ),
  )
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createPropertySchema, 'body')) body: CreatePropertyInput,
    @UploadedFiles()
    files?: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    const property = await this.propertiesService.createProperty(user.userId, body, files);
    return { status: 'success', message: 'Property created successfully', data: property };
  }

  @ApiBearerAuth()
  @Patch(':propertyId')
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
      ],
      PROPERTY_UPLOAD,
    ),
  )
  async update(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body(new ZodValidationPipe(updatePropertySchema, 'body')) body: UpdatePropertyInput,
    @UploadedFiles()
    files?: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    const property = await this.propertiesService.updateProperty(
      user.userId,
      propertyId,
      body,
      files,
    );
    return { status: 'success', message: 'Property updated successfully', data: property };
  }

  @ApiBearerAuth()
  @Delete(':propertyId')
  async remove(@CurrentUser() user: AuthUser, @Param('propertyId') propertyId: string) {
    const result = await this.propertiesService.softDeleteProperty(user.userId, propertyId);
    return {
      status: 'success',
      message: 'Property soft deleted successfully',
      data: result,
    };
  }

  @ApiBearerAuth()
  @Patch(':propertyId/status')
  @UsePipes(new ZodValidationPipe(updatePropertyStatusSchema, 'body'))
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() body: UpdatePropertyStatusInput,
  ) {
    const property = await this.propertiesService.updatePropertyStatus(
      user.userId,
      propertyId,
      body.status,
    );
    return {
      status: 'success',
      message: 'Property status updated successfully',
      data: property,
    };
  }
}
