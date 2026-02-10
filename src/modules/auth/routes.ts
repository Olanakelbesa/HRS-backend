import { Router } from 'express';
import * as authController from './controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Validation failed }
 *       409: { description: Email already registered }
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns user and token }
 *       400: { description: Validation failed }
 *       401: { description: Invalid email or password }
 *       423: { description: Account locked }
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200: { description: New access token generated }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user (requires JWT)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Missing or invalid token }
 */
router.get('/me', requireAuth, authController.getMe);

/**
 * @swagger
 * /api/v1/auth/health:
 *   get:
 *     summary: Auth module health check
 *     tags: [Auth]
 */
router.get('/health', (_, res) => res.json({ status: 'ok', module: 'auth' }));

export default router;
