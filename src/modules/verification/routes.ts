import { Router } from 'express';
import {
  uploadVerificationDocumentsController,
  getVerificationDocumentsController,
  getMyVerificationStatusController,
  updateVerificationStatusController,
  getPendingVerificationsController,
} from './controller';
import { uploadVerificationDocumentsSchema, updateVerificationStatusSchema } from './schema';
import { validate } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth.middleware';
import { memoryUpload } from '../../middlewares/multer.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Verification
 *     description: Owner verification document upload and approval endpoints
 */

/**
 * @openapi
 * /api/v1/verification/documents:
 *   post:
 *     summary: Upload verification documents (Owner only)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - front
 *               - back
 *               - livePhoto
 *             properties:
 *               front:
 *                 type: file
 *                 description: Front of national ID
 *               back:
 *                 type: file
 *                 description: Back of national ID
 *               livePhoto:
 *                 type: file
 *                 description: Live photo of the owner
 *     responses:
 *       201:
 *         description: Verification documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification documents uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     frontUrl:
 *                       type: string
 *                     backUrl:
 *                       type: string
 *                     livePhotoUrl:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected, resubmit]
 *       400:
 *         description: Bad request or already approved
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/documents',
  requireAuth,
  memoryUpload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
    { name: 'livePhoto', maxCount: 1 },
  ]),
  uploadVerificationDocumentsController
);

/**
 * @openapi
 * /api/v1/verification/my-status:
 *   get:
 *     summary: Get current user's verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification status fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         isVerified:
 *                           type: boolean
 *                         verificationState:
 *                           type: string
 *                           enum: [verified, pending, rejected, resubmit]
 *                         role:
 *                           type: string
 *                     document:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [pending, approved, rejected, resubmit]
 *                         submittedAt:
 *                           type: string
 *                           format: date-time
 *                         reviewedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         note:
 *                           type: string
 *                           nullable: true
 *       401:
 *         description: Unauthorized
 */
router.get('/my-status', requireAuth, getMyVerificationStatusController);

/**
 * @openapi
 * /api/v1/verification/documents/{userId}:
 *   get:
 *     summary: Get verification documents for a user (Admin or own documents)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification documents fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification documents fetched successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Verification documents not found
 */
router.get('/documents/:userId', requireAuth, getVerificationDocumentsController);

/**
 * @openapi
 * /api/v1/verification/documents/{userId}/status:
 *   patch:
 *     summary: Update verification status (Admin only)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, resubmit]
 *               note:
 *                 type: string
 *                 description: Admin note when rejecting or requesting resubmission
 *     responses:
 *       200:
 *         description: Verification status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification status updated successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Verification document not found
 */
router.patch(
  '/documents/:userId/status',
  requireAuth,
  validate(updateVerificationStatusSchema, 'body'),
  updateVerificationStatusController
);

/**
 * @openapi
 * /api/v1/verification/pending:
 *   get:
 *     summary: Get all pending verification requests (Admin only)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending verifications fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pending verifications fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected, resubmit]
 *                       submittedAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           first_name:
 *                             type: string
 *                           last_name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/pending', requireAuth, getPendingVerificationsController);

export default router;
