import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../core/AppError';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt.utils';

describe('jwt.utils', () => {
  const userId = 'user-123';
  const role = 'RENTER';

  describe('generateTokenPair', () => {
    it('returns access and refresh tokens', () => {
      const tokens = generateTokenPair(userId, role);

      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('decodes a valid access token', () => {
      const token = generateAccessToken(userId, role);
      expect(verifyAccessToken(token)).toEqual({ userId, role });
    });

    it('rejects a refresh token used as access token', () => {
      const refreshToken = generateRefreshToken(userId);

      expect(() => verifyAccessToken(refreshToken)).toThrow(AppError);
      expect(() => verifyAccessToken(refreshToken)).toThrow('Invalid access token');
    });

    it('rejects an invalid token', () => {
      expect(() => verifyAccessToken('not-a-token')).toThrow(AppError);
      expect(() => verifyAccessToken('not-a-token')).toThrow('Invalid access token');
    });

    it('rejects a token signed with the wrong secret', () => {
      const badToken = jwt.sign({ sub: userId, role, type: 'access' }, 'wrong-secret-at-least-32-characters!!');

      expect(() => verifyAccessToken(badToken)).toThrow(AppError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('decodes a valid refresh token', () => {
      const token = generateRefreshToken(userId);
      expect(verifyRefreshToken(token)).toEqual({ userId, role: '' });
    });

    it('rejects an access token used as refresh token', () => {
      const accessToken = generateAccessToken(userId, role);

      expect(() => verifyRefreshToken(accessToken)).toThrow(AppError);
      expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid refresh token');
    });

    it('rejects access tokens with the wrong type claim', () => {
      const wrongTypeToken = jwt.sign(
        { sub: userId, role, type: 'refresh' },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      expect(() => verifyAccessToken(wrongTypeToken)).toThrow('Invalid token type');
    });
  });
});
