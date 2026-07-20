import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';

describe('app routes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health', '/'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns ok status and uptime metadata', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.timestamp).toBe('string');
      expect(response.body.build).toBeDefined();
    });
  });

  describe('GET /api/health/schema', () => {
    it('returns prisma schema metadata', async () => {
      const response = await request(app.getHttpServer()).get('/api/health/schema');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.prismaClient).toBeDefined();
      expect(Array.isArray(response.body.prismaClient.enums)).toBe(true);
    });
  });
});
