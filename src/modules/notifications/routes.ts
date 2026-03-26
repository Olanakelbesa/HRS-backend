import { Router } from 'express';
import * as notificationController from './controller';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List current user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get('/', notificationController.listMine);

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
