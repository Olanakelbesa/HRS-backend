process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/house_rental_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-key-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-key-at-least-32-chars-long';
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY ?? '15m';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';

jest.mock('../config/redis', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    isOpen: false,
    isReady: false,
  },
  isRedisConnected: false,
}));
