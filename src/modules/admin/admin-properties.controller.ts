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
import { AdminPropertiesService } from './admin-properties.service';
import {
  adminUpdatePropertyBodySchema,
  approvePropertySchema,
  getAdminPropertiesQuerySchema,
  paramIdSchema,
  rejectPropertySchema,
  type AdminUpdatePropertyBodyInput,
  type ApprovePropertyInput,
  type GetAdminPropertiesQueryInput,
  type RejectPropertyInput,
} from './schema';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminPropertiesController {
  constructor(private readonly propertiesService: AdminPropertiesService) {}

  @Get('properties')
  @UsePipes(new ZodValidationPipe(getAdminPropertiesQuerySchema, 'query'))
  async list(@Query() query: GetAdminPropertiesQueryInput) {
    const data = await this.propertiesService.getProperties(query);
    return { status: 'success', data };
  }

  @Get('properties/:id')
  async get(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.propertiesService.getPropertyById(id);
    if (!data) throw new NotFoundException('Not found');
    return { status: 'success', data };
  }

  @Patch('properties/:id')
  @UsePipes(new ZodValidationPipe(adminUpdatePropertyBodySchema, 'body'))
  async override(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AdminUpdatePropertyBodyInput,
  ) {
    paramIdSchema.parse({ id });
    const updated = await this.propertiesService.overrideUpdate(
      user.userId,
      id,
      body,
    );
    if (!updated) throw new NotFoundException('Property not found');
    return { status: 'success', data: updated };
  }

  @Patch('properties/:id/approve')
  @UsePipes(new ZodValidationPipe(approvePropertySchema, 'body'))
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ApprovePropertyInput,
  ) {
    paramIdSchema.parse({ id });
    const data = await this.propertiesService.approve(user.userId, id, body);
    if (!data) throw new NotFoundException('Property not found');
    return { status: 'success', data };
  }

  @Patch('properties/:id/reject')
  @UsePipes(new ZodValidationPipe(rejectPropertySchema, 'body'))
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: RejectPropertyInput,
  ) {
    paramIdSchema.parse({ id });
    const data = await this.propertiesService.reject(user.userId, id, body);
    if (!data) throw new NotFoundException('Property not found');
    return { status: 'success', data };
  }
}
