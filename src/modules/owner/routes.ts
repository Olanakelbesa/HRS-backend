import { Router } from 'express';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate';
import { getOwnerOverviewQuerySchema } from './schema';
import { overview } from './controller';
import * as appointmentController from '../appointments/controller';
import { listAppointmentsQuerySchema } from '../appointments/schema';

const router = Router();

/**
 * @openapi
 * /api/v1/owner/overview:
 *   get:
 *     summary: Get owner dashboard overview (single aggregated payload)
 *     tags: [Owner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [weekly, monthly]
 *     responses:
 *       200:
 *         description: Owner overview loaded
 */
router.get(
  '/overview',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(getOwnerOverviewQuerySchema, 'query'),
  overview
);

/**
 * @openapi
 * /api/v1/owner/appointments:
 *   get:
 *     summary: List appointments for the authenticated owner
 *     tags: [Owner]
 */
router.get(
  '/appointments',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(listAppointmentsQuerySchema, 'query'),
  appointmentController.list
);

export default router;
