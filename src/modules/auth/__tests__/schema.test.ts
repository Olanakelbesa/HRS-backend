import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schema';

describe('auth schema', () => {
  describe('registerSchema', () => {
    it('accepts valid registration input', () => {
      const result = registerSchema.safeParse({
        body: {
          email: 'user@example.com',
          password: 'Password1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          phone: '+251911223344',
          role: 'renter',
        },
      });

      expect(result.success).toBe(true);
    });

    it('rejects weak passwords', () => {
      const result = registerSchema.safeParse({
        body: {
          email: 'user@example.com',
          password: 'password',
        },
      });

      expect(result.success).toBe(false);
    });

    it('treats blank phone as optional', () => {
      const result = registerSchema.safeParse({
        body: {
          email: 'user@example.com',
          password: 'Password1',
          phone: '   ',
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.phone).toBeUndefined();
      }
    });
  });

  describe('loginSchema', () => {
    it('requires email and password', () => {
      expect(
        loginSchema.safeParse({
          body: { email: 'user@example.com', password: 'secret' },
        }).success
      ).toBe(true);

      expect(
        loginSchema.safeParse({
          body: { email: 'user@example.com', password: '' },
        }).success
      ).toBe(false);
    });
  });

  describe('verifyEmailSchema', () => {
    it('requires a 6-digit code', () => {
      expect(verifyEmailSchema.safeParse({ body: { code: '123456' } }).success).toBe(true);
      expect(verifyEmailSchema.safeParse({ body: { code: '12345' } }).success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('validates email format', () => {
      expect(
        forgotPasswordSchema.safeParse({ body: { email: 'user@example.com' } }).success
      ).toBe(true);
      expect(forgotPasswordSchema.safeParse({ body: { email: 'not-an-email' } }).success).toBe(
        false
      );
    });
  });

  describe('resetPasswordSchema', () => {
    it('requires a valid code and strong password', () => {
      const result = resetPasswordSchema.safeParse({
        body: {
          code: '654321',
          password: 'NewPass1',
        },
      });

      expect(result.success).toBe(true);
    });
  });
});
