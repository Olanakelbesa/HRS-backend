import { Injectable } from '@nestjs/common';
import type { Express } from 'express';
import * as messagingService from './service';
import type {
  CreateConversationInput,
  CreateMessageInput,
  ListMessagesQuery,
  MessageReactionInput,
  SendAttachmentInput,
  UpdateMessageStatusInput,
} from './schema';

@Injectable()
export class MessagingApiService {
  listConversations(userId: string) {
    return messagingService.listConversations(userId);
  }

  createConversation(userId: string, input: CreateConversationInput) {
    return messagingService.createConversation(userId, input);
  }

  listMessages(conversationId: string, userId: string, query: ListMessagesQuery) {
    return messagingService.listMessages(conversationId, userId, query);
  }

  sendMessage(conversationId: string, userId: string, input: CreateMessageInput) {
    return messagingService.sendMessage(conversationId, userId, input);
  }

  updateMessageStatus(messageId: string, userId: string, input: UpdateMessageStatusInput) {
    return messagingService.updateMessageStatus(messageId, userId, input);
  }

  sendAttachment(
    conversationId: string,
    userId: string,
    file: Express.Multer.File,
    input: SendAttachmentInput,
  ) {
    return messagingService.sendAttachment(conversationId, userId, file, input);
  }

  addReaction(messageId: string, userId: string, input: MessageReactionInput) {
    return messagingService.addReaction(messageId, userId, input);
  }

  removeReaction(messageId: string, userId: string, input: MessageReactionInput) {
    return messagingService.removeReaction(messageId, userId, input);
  }

  deleteMessage(messageId: string, userId: string) {
    return messagingService.deleteMessage(messageId, userId);
  }

  deleteConversation(conversationId: string, userId: string) {
    return messagingService.deleteConversation(conversationId, userId);
  }

  markConversationAsRead(conversationId: string, userId: string) {
    return messagingService.markConversationAsRead(conversationId, userId);
  }

  getConversationMetadata(conversationId: string, userId: string) {
    return messagingService.getConversationMetadata(conversationId, userId);
  }

  assertParticipant(conversationId: string, userId: string) {
    return messagingService.assertParticipant(conversationId, userId);
  }
}
