import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';
import { MessagingApiService } from './messaging.api.service';
import { MessagingGateway } from './messaging.gateway';

@Module({
  controllers: [ConversationsController, MessagesController],
  providers: [MessagingApiService, MessagingGateway],
  exports: [MessagingApiService, MessagingGateway],
})
export class MessagingModule {}
