import { Router } from 'express';
import * as paymentController from './controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { memoryUpload } from '../../middlewares/multer.middleware';
import { validate } from '../../middlewares/validate';
import { chapaVerifySchema } from './schema';

/**
 * @openapi
 * tags:
 *   - name: Payment
 *     description: Payment processing and history endpoints
 *
 * /api/v1/payments/chapa/webhook:
 *   post:
 *     summary: Process a Chapa webhook event
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *
 * /api/v1/payments/chapa/callback:
 *   get:
 *     summary: Handle Chapa success callback and redirect
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: tx_ref
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       302:
 *         description: Redirect to frontend payment return page
 *
 * /api/v1/payments:
 *   get:
 *     summary: List payments for authenticated user
 *     tags: [Payment]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, success, failed, expired]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *
 * /api/v1/payments/summary:
 *   get:
 *     summary: Get payment summary for the authenticated user
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment summary retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *
 * /api/v1/payments/export:
 *   get:
 *     summary: Export payments as CSV
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, success, failed, expired]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV export of payments
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /api/v1/payments/chapa/verify:
 *   post:
 *     summary: Verify a Chapa payment by transaction reference
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tx_ref:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verification complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *
 * /api/v1/payments/{id}/proof:
 *   get:
 *     summary: Get payment proof details
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment proof retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *   post:
 *     summary: Upload proof of payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Payment proof uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *
 * /api/v1/payments/{id}/confirm:
 *   patch:
 *     summary: Confirm a payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 */

const router = Router();

router.post('/chapa/webhook', paymentController.chapaWebhook);
router.get('/chapa/callback', paymentController.chapaCallback);

router.use(requireAuth);

router.get('/', paymentController.listPayments);
router.get('/summary', paymentController.getPaymentSummary);
router.get('/export', paymentController.exportPayments);
router.post('/chapa/verify', validate(chapaVerifySchema), paymentController.chapaVerify);

router.get('/:id/proof', paymentController.getPaymentProof);
router.post('/:id/proof', memoryUpload.single('file'), paymentController.uploadPaymentProof);
router.patch('/:id/confirm', paymentController.confirmPayment);

export default router;
