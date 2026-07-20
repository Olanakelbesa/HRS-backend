import { Body, Controller, Get, Param, Patch, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  changePasswordSchema,
  updateProfileSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  getUserByIdSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from './schema';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @Get('profile')
  async getProfile(@CurrentUser() user: AuthUser) {
    const profile = await this.usersService.getProfile(user.userId);
    return { status: 'success', data: { user: profile } };
  }

  @ApiBearerAuth()
  @Patch('profile')
  @UsePipes(new ZodValidationPipe(updateProfileSchema, 'body'))
  async updateProfile(@CurrentUser() user: AuthUser, @Body() body: UpdateProfileInput) {
    const profile = await this.usersService.updateProfile(user.userId, body);
    return { status: 'success', data: { user: profile } };
  }

  @ApiBearerAuth()
  @Patch('change-password')
  @UsePipes(new ZodValidationPipe(changePasswordSchema, 'body'))
  async changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordInput) {
    const result = await this.usersService.changePassword(user.userId, body);
    return { status: 'success', data: result };
  }

  @ApiBearerAuth()
  @Roles('admin')
  @Get()
  async getAllUsers() {
    const users = await this.usersService.getAllUsers();
    return { status: 'success', results: users.length, data: users };
  }

  @Public()
  @Get(':id')
  async getOwnerProfile(@Param('id') id: string) {
    const parsed = getUserByIdSchema.safeParse({ params: { id } });
    if (!parsed.success) {
      return {
        status: 'error',
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    const result = await this.usersService.getOwnerProfile(parsed.data.params.id);
    return { status: 'success', data: result };
  }

  @ApiBearerAuth()
  @Roles('admin')
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: 'renter' | 'owner' | 'admin' },
  ) {
    const parsed = updateUserRoleSchema.safeParse({ params: { id }, body });
    if (!parsed.success) {
      return {
        status: 'error',
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    const user = await this.usersService.updateUserRole(id, parsed.data.body.role);
    return { status: 'success', data: user };
  }

  @ApiBearerAuth()
  @Roles('admin')
  @Patch(':id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    const parsed = updateUserStatusSchema.safeParse({ params: { id }, body });
    if (!parsed.success) {
      return {
        status: 'error',
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    const user = await this.usersService.updateUserStatus(id, parsed.data.body.isActive);
    return { status: 'success', data: user };
  }
}
