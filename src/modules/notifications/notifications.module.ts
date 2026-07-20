import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsApiService } from './notifications.api.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsApiService],
  exports: [NotificationsApiService],
})
export class NotificationsModule {}
