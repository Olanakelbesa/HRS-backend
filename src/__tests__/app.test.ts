import request from 'supertest';
import app from '../app';

describe('app routes', () => {
  describe('GET /health', () => {
    it('returns ok status and uptime metadata', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.timestamp).toBe('string');
      expect(response.body.build).toBeDefined();
    });
  });

  describe('GET /swagger.json', () => {
    it('returns the OpenAPI specification', async () => {
      const response = await request(app).get('/swagger.json');

      expect(response.status).toBe(200);
      expect(response.body.openapi || response.body.swagger).toBeDefined();
      expect(response.headers['cache-control']).toBe('no-store');
    });
  });

  describe('GET /api/v1/health/schema', () => {
    it('returns prisma schema metadata', async () => {
      const response = await request(app).get('/api/v1/health/schema');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.prismaClient).toBeDefined();
      expect(Array.isArray(response.body.prismaClient.enums)).toBe(true);
    });
  });
});
