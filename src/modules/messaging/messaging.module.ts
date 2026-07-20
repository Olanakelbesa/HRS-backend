import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Module({
  controllers: [ConversationsController, MessagesController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
