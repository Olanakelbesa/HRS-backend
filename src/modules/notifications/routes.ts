import { Router } from 'express';
import * as notificationController from './controller';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List notifications (role-scoped)
 *     description: |
 *       - **owner / renter**: own inbox (includes chat alerts)
 *       - **admin**: platform feed excluding renter↔owner MESSAGE_NEW; supports page, limit query
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get('/', notificationController.listMine);

/**
 * @swagger
 * /api/v1/notifications/broadcast:
 *   post:
 *     summary: Broadcast notification to users (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Broadcast sent
 */
router.post('/broadcast', restrictTo('admin'), notificationController.broadcast);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', notificationController.markRead);

/**
 * @swagger
 * /api/v1/notifications/admin/audit:
 *   get:
 *     summary: Admin audit logs for monitoring and analytics
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs
 */
router.get('/admin/audit', restrictTo('admin'), notificationController.listAudit);

export default router;
