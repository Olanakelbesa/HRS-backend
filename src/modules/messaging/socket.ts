import type { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from '../../config/env';
import { verifyAccessToken } from '../../utils/jwt.utils';
import * as messagingService from './service';
import { canUseMessaging } from './access';

const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;
const userRoom = (userId: string) => `user:${userId}`;

async function configureRedisAdapter(io: Server) {
  if (!env.REDIS_URL) return;

  const pubClient = createClient({ url: env.REDIS_URL });
  const subClient = pubClient.duplicate();

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('⚡ Socket.io Redis adapter connected');
  } catch (err) {
    console.warn('⚠ Socket.io Redis adapter unavailable, falling back to memory');
  }
}

function getToken(socket: Socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.length > 0) return authToken;

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);

  return null;
}

export async function initMessagingSocket(io: Server) {
  await configureRedisAdapter(io);

  io.use((socket, next) => {
    const token = getToken(socket);
    if (!token) return next(new Error('Unauthorized'));

    try {
      const decoded = verifyAccessToken(token);
      socket.data.userId = decoded.userId;
      socket.data.userRole = decoded.role;
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  const rejectMessaging = (socket: Socket, ack?: (payload: unknown) => void) => {
    if (canUseMessaging(socket.data.userRole as string)) return false;
    ack?.({ status: 'error', message: 'Messaging is only available for owner and renter accounts' });
    return true;
  };

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    if (userId) socket.join(userRoom(userId));

    socket.on('conversation:join', async (conversationId: string, ack?: (payload: any) => void) => {
      if (rejectMessaging(socket, ack)) return;
      try {
        await messagingService.assertParticipant(conversationId, userId);
        socket.join(conversationRoom(conversationId));
        ack?.({ status: 'ok' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to join conversation';
        ack?.({ status: 'error', message });
      }
    });

    socket.on(
      'conversation:typing',
      async (payload: { conversationId: string; isTyping: boolean }, ack?: (data: any) => void) => {
        if (rejectMessaging(socket, ack)) return;
        try {
          const { conversationId, isTyping } = payload;
          await messagingService.assertParticipant(conversationId, userId);
          socket.to(conversationRoom(conversationId)).emit('message:typing', {
            conversationId,
            userId,
            isTyping,
          });
          ack?.({ status: 'ok' });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to send typing state';
          ack?.({ status: 'error', message });
        }
      }
    );

    socket.on(
      'message:send',
      async (
        payload: { conversationId: string; content: string; replyToId?: string },
        ack?: (data: any) => void
      ) => {
        if (rejectMessaging(socket, ack)) return;
        try {
          const { conversationId, content, replyToId } = payload;
          const result = await messagingService.sendMessage(conversationId, userId, {
            content,
            replyToId,
          });
          const otherUserId =
            result.conversation.renterId === userId
              ? result.conversation.ownerId
              : result.conversation.renterId;

          io.to(conversationRoom(conversationId)).emit('message:new', result.message);
          io.to(userRoom(otherUserId)).emit('message:new', result.message);

          ack?.({ status: 'ok', data: result.message });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to send message';
          ack?.({ status: 'error', message });
        }
      }
    );

    socket.on(
      'message:reaction:add',
      async (payload: { messageId: string; emoji: string }, ack?: (data: any) => void) => {
        if (rejectMessaging(socket, ack)) return;
        try {
          const message = await messagingService.addReaction(payload.messageId, userId, {
            emoji: payload.emoji,
          });
          if (!message) return ack?.({ status: 'error', message: 'Message not found' });
          io.to(conversationRoom(message.conversationId)).emit('message:updated', message);
          ack?.({ status: 'ok', data: message });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to add reaction';
          ack?.({ status: 'error', message });
        }
      }
    );

    socket.on(
      'message:reaction:remove',
      async (payload: { messageId: string; emoji: string }, ack?: (data: any) => void) => {
        if (rejectMessaging(socket, ack)) return;
        try {
          const message = await messagingService.removeReaction(payload.messageId, userId, {
            emoji: payload.emoji,
          });
          if (!message) return ack?.({ status: 'error', message: 'Message not found' });
          io.to(conversationRoom(message.conversationId)).emit('message:updated', message);
          ack?.({ status: 'ok', data: message });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to remove reaction';
          ack?.({ status: 'error', message });
        }
      }
    );

    socket.on(
      'message:delete',
      async (payload: { messageId: string }, ack?: (data: any) => void) => {
        if (rejectMessaging(socket, ack)) return;
        try {
          const result = await messagingService.deleteMessage(payload.messageId, userId);
          io.to(conversationRoom(result.conversationId)).emit('message:deleted', result);
          ack?.({ status: 'ok', data: result });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to delete message';
          ack?.({ status: 'error', message });
        }
      }
    );
  });
}
