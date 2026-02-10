import './config/redis'; // Connect Redis at startup
import app from './app';
import { env } from './config/env';
import prisma from './config/database';

const PORT = env.PORT || 3000;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('🐘 PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', (err as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📖 Docs available on http://localhost:${PORT}/api-docs`);
  });
}

bootstrap();
