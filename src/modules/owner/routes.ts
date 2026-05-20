import { Router } from 'express';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate';
import { getOwnerOverviewQuerySchema } from './schema';
import { overview } from './controller';

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
  restrictTo('owner'),
  validate(getOwnerOverviewQuerySchema, 'query'),
  overview
);

export default router;
