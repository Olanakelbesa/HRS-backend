import './config/redis'; // Connect Redis at startup
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { initMessagingSocket } from './modules/messaging/socket';

const PORT = env.PORT || 3000;

// Create HTTP server from Express app
const httpServer = http.createServer(app);

// Create Socket.io server
export const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('🐘 PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', (err as Error).message);
  }

  // Initialize Socket.io for messaging
  initMessagingSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📖 Docs available on http://localhost:${PORT}/api-docs`);
  });
}

bootstrap();
