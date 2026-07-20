import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { env } from '../../config/env';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private connected = false;

  async onModuleInit() {
    this.client = createClient({
      url: env.REDIS_URL,
      socket: {
        reconnectStrategy: () => false,
      },
    });

    this.client.on('error', (err) => {
      if (env.NODE_ENV === 'production') {
        this.logger.error('Redis Client Error', err as Error);
      }
    });

    try {
      await this.client.connect();
      this.connected = true;
      this.logger.log('Redis Connected');
    } catch {
      this.connected = false;
      if (env.NODE_ENV === 'development') {
        this.logger.warn('Redis unavailable. Running without cache.');
      } else {
        this.logger.error('Redis connection failed');
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.connected) {
      await this.client.quit().catch(() => undefined);
    }
  }

  getClient() {
    return this.client;
  }

  isConnected() {
    return this.connected;
  }
}
