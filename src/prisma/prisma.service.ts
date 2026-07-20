import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      if (process.env.NODE_ENV === 'test') {
        console.warn('⚠️ Test mode: Prisma connection failed, continuing with mocks/offline mode.');
      } else {
        throw err;
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // Ignore disconnect errors during shutdown
    }
  }
}
