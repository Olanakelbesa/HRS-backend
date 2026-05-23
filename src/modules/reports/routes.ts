import { Router } from 'express';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate';
import { memoryUpload } from '../../middlewares/multer.middleware';
import {
  getOwnerReportsQuerySchema,
  reportIdParamSchema,
  submitOwnerResponseSchema,
  submitReportSchema,
} from './schema';
import { listOwnerReports, getOwnerReport, submitResponse, submitReport } from './controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Reports
 *     description: Reports endpoints for renters, owners, and admins
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
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       targetType:
 *                         type: string
 *                       targetId:
 *                         type: string
 *                       category:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                 meta:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  requireAuth,
  restrictTo('renter'),
  memoryUpload.array('images', 10),
  validate(submitReportSchema, 'body'),
  submitReport
);

/**
 * @openapi
 * /api/v1/reports:
 *   post:
 *     summary: Submit a new report as a renter
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, category, description]
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [property, user]
 *                 example: property
 *               targetId:
 *                 type: string
 *                 example: "cku123abc"
 *               category:
 *                 type: string
 *                 example: "Noise complaint"
 *               description:
 *                 type: string
 *                 example: "The tenant is creating loud noise every evening and the owner has not responded."
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Optional image files to upload.
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, category, description]
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [property, user]
 *                 example: property
 *               targetId:
 *                 type: string
 *                 example: "cku123abc"
 *               category:
 *                 type: string
 *                 example: "Noise complaint"
 *               description:
 *                 type: string
 *                 example: "The tenant is creating loud noise every evening and the owner has not responded."
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/image.jpg"]
 *                 description: Optional list of pre-uploaded image URLs.
 *     responses:
 *       201:
 *         description: Report submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         reportedById:
 *                           type: string
 *                         targetType:
 *                           type: string
 *                         targetId:
 *                           type: string
 *                         category:
 *                           type: string
 *                         description:
 *                           type: string
 *                         status:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                         ownerResponse:
 *                           type: string
 *                         respondedAt:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 *       400:
 *         description: Validation failed
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         reportedById:
 *                           type: string
 *                         targetType:
 *                           type: string
 *                         targetId:
 *                           type: string
 *                         category:
 *                           type: string
 *                         description:
 *                           type: string
 *                         status:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                         ownerResponse:
 *                           type: string
 *                         respondedAt:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                         updatedAt:
 *                           type: string
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
