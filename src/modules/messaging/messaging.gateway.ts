import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server, Socket } from 'socket.io';
import { env } from '../../config/env';
import { verifyAccessToken } from '../../utils/jwt.utils';
import { Public } from '../../common/decorators/public.decorator';
import { canUseMessaging } from './access';
import { MessagingApiService } from './messaging.api.service';

const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;
const userRoom = (userId: string) => `user:${userId}`;

@Public()
@WebSocketGateway({
  cors: {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  },
})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly messagingService: MessagingApiService) {}

  async afterInit(server: Server) {
    await this.configureRedisAdapter(server);

    server.use((socket, next) => {
      const token = this.getToken(socket);
      if (!token) return next(new Error('Unauthorized'));

      try {
        const decoded = verifyAccessToken(token);
        socket.data.userId = decoded.userId;
        socket.data.userRole = decoded.role;
        return next();
      } catch {
        return next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      client.join(userRoom(userId));
    }
  }

  @SubscribeMessage('conversation:join')
  async onConversationJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() conversationId: string,
  ) {
    if (this.rejectMessaging(socket)) {
      return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
    }

    try {
      const userId = socket.data.userId as string;
      await this.messagingService.assertParticipant(conversationId, userId);
      socket.join(conversationRoom(conversationId));
      return { status: 'ok' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to join conversation';
      return { status: 'error', message };
    }
  }

  @SubscribeMessage('conversation:typing')
  async onTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
  ) {
    if (this.rejectMessaging(socket)) {
      return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
    }

    try {
      const userId = socket.data.userId as string;
      const { conversationId, isTyping } = payload;
      await this.messagingService.assertParticipant(conversationId, userId);
      socket.to(conversationRoom(conversationId)).emit('message:typing', {
        conversationId,
        userId,
        isTyping,
      });
      return { status: 'ok' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send typing state';
      return { status: 'error', message };
    }
  }

  @SubscribeMessage('message:send')
  async onMessageSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: { conversationId: string; content: string; replyToId?: string },
  ) {
    if (this.rejectMessaging(socket)) {
      return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
    }

    try {
      const userId = socket.data.userId as string;
      const { conversationId, content, replyToId } = payload;
      const result = await this.messagingService.sendMessage(conversationId, userId, {
        content,
        replyToId,
      });
      const otherUserId =
        result.conversation.renterId === userId
          ? result.conversation.ownerId
          : result.conversation.renterId;

      this.server.to(conversationRoom(conversationId)).emit('message:new', result.message);
      this.server.to(userRoom(otherUserId)).emit('message:new', result.message);

      return { status: 'ok', data: result.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send message';
      return { status: 'error', message };
    }
  }

  @SubscribeMessage('message:reaction:add')
  async onReactionAdd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { messageId: string; emoji: string },
  ) {
    if (this.rejectMessaging(socket)) {
      return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
    }

    try {
      const userId = socket.data.userId as string;
      const message = await this.messagingService.addReaction(payload.messageId, userId, {
        emoji: payload.emoji,
      });
      if (!message) return { status: 'error', message: 'Message not found' };
      this.server.to(conversationRoom(message.conversationId)).emit('message:updated', message);
      return { status: 'ok', data: message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to add reaction';
      return { status: 'error', message };
    }
  }

  @SubscribeMessage('message:reaction:remove')
  async onReactionRemove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { messageId: string; emoji: string },
  ) {
    if (this.rejectMessaging(socket)) {
      return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
    }

    try {
      const userId = socket.data.userId as string;
      const message = await this.messagingService.removeReaction(payload.messageId, userId, {
        emoji: payload.emoji,
      });
      if (!message) return { status: 'error', message: 'Message not found' };
      this.server.to(conversationRoom(message.conversationId)).emit('message:updated', message);
      return { status: 'ok', data: message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to remove reaction';
      return { status: 'error', message };
    }
  }

  @SubscribeMessage('message:delete')
  async onMessageDelete(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { messageId: string },
  ) {
    if (this.rejectMessaging(socket)) {
      return { status: 'error', message: 'Messaging is only available for owner and renter accounts' };
    }

    try {
      const userId = socket.data.userId as string;
      const result = await this.messagingService.deleteMessage(payload.messageId, userId);
      this.server.to(conversationRoom(result.conversationId)).emit('message:deleted', result);
      return { status: 'ok', data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete message';
      return { status: 'error', message };
    }
  }

  /** Emit to a user's personal room (e.g. notification:new). */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  private rejectMessaging(socket: Socket): boolean {
    return !canUseMessaging(socket.data.userRole as string);
  }

  private getToken(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) return authToken;

    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);

    return null;
  }

  private async configureRedisAdapter(io: Server) {
    if (!env.REDIS_URL) return;

    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      this.logger.log('Socket.io Redis adapter connected');
    } catch {
      this.logger.warn('Socket.io Redis adapter unavailable, falling back to memory');
    }
  }
}
