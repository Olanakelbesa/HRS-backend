import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate';
import { getOwnerReportsQuerySchema, reportIdParamSchema, submitOwnerResponseSchema } from './schema';
import { listOwnerReports, getOwnerReport, submitResponse } from './controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Reports
 *     description: Owner-facing reports endpoints (Reports Against Me)
 */

/**
 * @openapi
 * /api/v1/reports:
 *   get:
 *     summary: Get reports filed against the authenticated owner (or their properties)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_review, resolved, dismissed]
 *     responses:
 *       200:
 *         description: Reports fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     open:
 *                       type: integer
 *                     resolved:
 *                       type: integer
 *                 items:
 *                   type: array
 *                 meta:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  requireAuth,
  validate(getOwnerReportsQuerySchema, 'query'),
  listOwnerReports
);

/**
 * @openapi
 * /api/v1/reports/{reportId}:
 *   get:
 *     summary: Get a single report detail (only if it targets the authenticated owner)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report fetched successfully
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:reportId',
  requireAuth,
  validate(reportIdParamSchema, 'params'),
  getOwnerReport
);

/**
 * @openapi
 * /api/v1/reports/{reportId}/response:
 *   post:
 *     summary: Submit or update the owner's written response to a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               response:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: "The noise complaint is unfounded. We have addressed the situation with the tenant."
 *     responses:
 *       200:
 *         description: Response submitted successfully
 *       400:
 *         description: Report is already closed or validation failed
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:reportId/response',
  requireAuth,
  validate(reportIdParamSchema, 'params'),
  validate(submitOwnerResponseSchema, 'body'),
  submitResponse
);

export default router;
