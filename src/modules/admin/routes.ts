import { Router } from 'express';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate';
import {
  adminUpdatePropertyBodySchema,
  adminUpdatePropertyParamsSchema,
  getAnalyticsQuerySchema,
  getAuditLogsQuerySchema,
  getPendingVerificationsQuerySchema,
} from './schema';
import { analytics, auditLogs, overrideProperty, pendingVerifications } from './controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin-only operations and platform oversight endpoints
 */

// All routes below are protected and can only be accessed by admins.
router.use(requireAuth, restrictTo('admin'));

/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     summary: Get platform-wide analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *         description: Optional timeframe filter for trend counters
 *     responses:
 *       200:
 *         description: Analytics fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.get('/analytics', validate(getAnalyticsQuerySchema, 'query'), analytics);

/**
 * @swagger
 * /api/v1/admin/pending-verifications:
 *   get:
 *     summary: List owners waiting for verification
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by first name, last name, email, or phone
 *       - in: query
 *         name: emailVerified
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by whether owner's email is verified
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, first_name, last_name]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Pending verifications fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.get(
  '/pending-verifications',
  validate(getPendingVerificationsQuerySchema, 'query'),
  pendingVerifications
);

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: List audit logs with optional filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by event type, entity type, or entity id
 *       - in: query
 *         name: eventType
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: actorId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [createdAt]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.get('/audit-logs', validate(getAuditLogsQuerySchema, 'query'), auditLogs);

/**
 * @swagger
 * /api/v1/admin/properties/{id}:
 *   patch:
 *     summary: Admin override update for a property
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any allowed property fields to override
 *     responses:
 *       200:
 *         description: Property updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Property not found
 */
router.patch(
  '/properties/:id',
  validate(adminUpdatePropertyParamsSchema, 'params'),
  validate(adminUpdatePropertyBodySchema),
  overrideProperty
);

export default router;
