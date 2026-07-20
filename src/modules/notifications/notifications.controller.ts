import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  broadcastNotificationSchema,
  listNotificationsQuerySchema,
} from './schema';
import type { z } from 'zod';

type BroadcastInput = z.infer<typeof broadcastNotificationSchema>;
type ListQuery = z.infer<typeof listNotificationsQuerySchema>;

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listNotificationsQuerySchema, 'query'))
  async listMine(@CurrentUser() user: AuthUser, @Query() query: ListQuery) {
    const data = await this.notificationsService.listNotifications({
      userId: user.userId,
      role: user.role,
      page: query.page,
      limit: query.limit,
    });
    return { status: 'success', data };
  }

  @Post('broadcast')
  @Roles('admin')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(broadcastNotificationSchema, 'body'))
  async broadcast(@CurrentUser() user: AuthUser, @Body() body: BroadcastInput) {
    const result = await this.notificationsService.broadcastNotification(user.userId, body);
    return { status: 'success', data: result };
  }

  @Get('admin/audit')
  @Roles('admin')
  async listAudit() {
    const logs = await this.notificationsService.listAuditLogs();
    return { status: 'success', data: { logs } };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notificationsService.markNotificationRead(user.userId, id);
    return { status: 'success', data: { id } };
  }
}
