import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { AppError } from '../../core/AppError';
import { requireAuth, restrictTo } from '../auth.middleware';
import { generateAccessToken } from '../../utils/jwt.utils';

function buildAuthApp() {
  const app = express();
  app.use(express.json());

  app.get('/protected', requireAuth, (req, res) => {
    res.json({ userId: (req as Request & { userId?: string }).userId });
  });

  app.get('/admin-only', requireAuth, restrictTo('admin'), (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('auth.middleware', () => {
  const app = buildAuthApp();

  it('returns 401 when no bearer token is provided', async () => {
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authorization token required');
  });

  it('allows access with a valid token', async () => {
    const token = generateAccessToken('user-42', 'RENTER');

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe('user-42');
  });

  it('returns 403 when role is not allowed', async () => {
    const token = generateAccessToken('user-42', 'RENTER');

    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
  });

  it('allows admin role when restricted to admin', async () => {
    const token = generateAccessToken('admin-1', 'admin');

    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});

describe('error.middleware', () => {
  it('maps AppError to the configured status code', async () => {
    const { errorHandler } = await import('../error.middleware');
    const app = express();

    app.get('/boom', (_req, _res, next: NextFunction) => {
      next(new AppError('Not found', 404));
    });
    app.use(errorHandler);

    const response = await request(app).get('/boom');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Not found',
    });
  });
});
