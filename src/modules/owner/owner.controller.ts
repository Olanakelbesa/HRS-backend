import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OwnerApiService } from './owner.api.service';
import {
  getOwnerOverviewQuerySchema,
  type GetOwnerOverviewQueryInput,
} from './schema';

@ApiTags('Owner')
@ApiBearerAuth()
@Roles('owner', 'admin')
@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerApiService) {}

  @Get('overview')
  @UsePipes(new ZodValidationPipe(getOwnerOverviewQuerySchema, 'query'))
  async overview(
    @CurrentUser() user: AuthUser,
    @Query() query: GetOwnerOverviewQueryInput,
  ) {
    const data = await this.ownerService.getOverview(user.userId, query);
    return { status: 'success', message: 'Owner overview loaded', data };
  }
}
