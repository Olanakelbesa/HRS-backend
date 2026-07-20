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
import { AdminUsersService } from './admin-users.service';
import {
  getPendingVerificationsQuerySchema,
  getUsersQuerySchema,
  paramIdSchema,
  resolveVerificationSchema,
  updateUserStatusSchema,
  updateUserVerificationSchema,
  type GetPendingVerificationsQueryInput,
  type GetUsersQueryInput,
} from './schema';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get('pending-verifications')
  @UsePipes(new ZodValidationPipe(getPendingVerificationsQuerySchema, 'query'))
  async pendingVerifications(@Query() query: GetPendingVerificationsQueryInput) {
    const data = await this.usersService.getPendingVerifications(query);
    return { status: 'success', data };
  }

  @Get('users')
  @UsePipes(new ZodValidationPipe(getUsersQuerySchema, 'query'))
  async list(@Query() query: GetUsersQueryInput) {
    const data = await this.usersService.getUsers(query);
    return { status: 'success', data };
  }

  @Get('users/:id/documents')
  async getDocuments(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.usersService.getUserDocuments(id);
    return { status: 'success', data };
  }

  @Get('users/:id')
  async get(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.usersService.getUserById(id);
    if (!data) throw new NotFoundException('Not found');
    return { status: 'success', data };
  }

  @Patch('users/:id/status')
  @UsePipes(new ZodValidationPipe(updateUserStatusSchema, 'body'))
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    paramIdSchema.parse({ id });
    const data = await this.usersService.updateUserStatus(
      user.userId,
      id,
      body.status,
    );
    return { status: 'success', data };
  }

  @Patch('users/:id/verification')
  @UsePipes(new ZodValidationPipe(updateUserVerificationSchema, 'body'))
  async updateVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { verificationState: string; comment?: string },
  ) {
    paramIdSchema.parse({ id });
    const data = await this.usersService.updateUserVerificationState(
      user.userId,
      id,
      body.verificationState,
      body.comment,
    );
    return { status: 'success', data };
  }

  @Patch('verifications/:id/resolve')
  @UsePipes(new ZodValidationPipe(resolveVerificationSchema, 'body'))
  async resolveVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      status: 'approved' | 'rejected' | 'resubmit' | 'pending' | 'under_review';
      note?: string;
    },
  ) {
    paramIdSchema.parse({ id });
    const data = await this.usersService.resolveVerification(
      user.userId,
      id,
      body.status,
      body.note,
    );
    return { status: 'success', data };
  }
}
