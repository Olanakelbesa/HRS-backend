import { Router } from 'express';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate';
import * as agreementController from './controller';
import { overview as ownerOverview } from '../owner/controller';
import { getOwnerOverviewQuerySchema } from '../owner/schema';
import * as appointmentController from '../appointments/controller';
import { listAppointmentsQuerySchema } from '../appointments/schema';
import {
  listAgreementsQuerySchema,
  listOwnerAgreementsQuerySchema,
  createOwnerAgreementSchema,
  updateDraftAgreementSchema,
  sendAgreementSchema,
  cancelAgreementSchema,
  rejectAgreementSchema,
} from './schema';

/**
 * @openapi
 * tags:
 *   - name: Agreement
 *     description: Lease agreement endpoints for owners and renters
 *
 * /api/v1/owner/agreements:
 *   get:
 *     summary: List owner agreements
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, payment_pending, completed, rejected, cancelled, terminated, expired]
 *     responses:
 *       200:
 *         description: Agreements retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Agreement'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *   post:
 *     summary: Create a draft agreement for an owner
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyId:
 *                 type: string
 *               renterId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               monthlyRent:
 *                 type: number
 *               currency:
 *                 type: string
 *               appointmentId:
 *                 type: string
 *               ownerMessage:
 *                 type: string
 *               offerExpiresAt:
 *                 type: string
 *                 format: date
 *               send:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Agreement created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/owner/agreements/export:
 *   get:
 *     summary: Export owner agreements as CSV
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV export of agreements
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /api/v1/owner/agreements/{id}:
 *   patch:
 *     summary: Update a draft agreement
 *     tags: [Agreement]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               monthlyRent:
 *                 type: number
 *               currency:
 *                 type: string
 *               ownerMessage:
 *                 type: string
 *               offerExpiresAt:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Agreement updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/owner/agreements/{id}/send:
 *   post:
 *     summary: Send a draft agreement to the renter
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               offerExpiresAt:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Agreement sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/owner/agreements/{id}/cancel:
 *   post:
 *     summary: Cancel an agreement as owner
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agreement cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/agreements/me:
 *   get:
 *     summary: List renter agreements
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, payment_pending, completed, rejected, cancelled, terminated, expired]
 *     responses:
 *       200:
 *         description: Renter agreements retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Agreement'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *
 * /api/v1/agreements/{id}:
 *   get:
 *     summary: Get agreement detail by id
 *     tags: [Agreement]
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
 *         description: Agreement detail retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/agreements/{id}/payments:
 *   get:
 *     summary: List payments for an agreement
 *     tags: [Agreement]
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
 *         description: Agreement payments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *
 * /api/v1/agreements/{id}/accept:
 *   post:
 *     summary: Accept an agreement as renter
 *     tags: [Agreement]
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
 *         description: Agreement accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/agreements/{id}/reject:
 *   post:
 *     summary: Reject an agreement as renter
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agreement rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/agreements/{id}/cancel:
 *   post:
 *     summary: Cancel an agreement as renter or owner
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agreement cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 *
 * /api/v1/agreements/{id}/deposit/initiate:
 *   post:
 *     summary: Initiate a deposit payment for an agreement
 *     tags: [Agreement]
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
 *         description: Deposit checkout ready
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
 * /api/v1/agreements/{id}/deposit/status:
 *   get:
 *     summary: Get deposit status for an agreement
 *     tags: [Agreement]
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
 *         description: Deposit status retrieved
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
 * /api/v1/agreements/{id}/terminate:
 *   post:
 *     summary: Terminate an agreement
 *     tags: [Agreement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agreement terminated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreement:
 *                       $ref: '#/components/schemas/Agreement'
 */

const router = Router();

router.get(
  '/owner/agreements',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(listOwnerAgreementsQuerySchema, 'query'),
  agreementController.listOwnerAgreements
);

router.get(
  '/owner/agreements/export',
  requireAuth,
  restrictTo('owner', 'admin'),
  agreementController.exportOwnerAgreements
);

router.post(
  '/owner/agreements',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(createOwnerAgreementSchema),
  agreementController.createOwnerAgreement
);

router.patch(
  '/owner/agreements/:id',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(updateDraftAgreementSchema),
  agreementController.updateDraftAgreement
);

router.post(
  '/owner/agreements/:id/send',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(sendAgreementSchema),
  agreementController.sendAgreement
);

router.post(
  '/owner/agreements/:id/cancel',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(cancelAgreementSchema),
  agreementController.cancelAgreement
);

router.get(
  '/owner/overview',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(getOwnerOverviewQuerySchema, 'query'),
  ownerOverview
);

router.get(
  '/owner/appointments',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(listAppointmentsQuerySchema, 'query'),
  appointmentController.list
);

router.get(
  '/agreements/me',
  requireAuth,
  restrictTo('renter', 'admin'),
  validate(listAgreementsQuerySchema, 'query'),
  agreementController.listRenterAgreements
);

router.get('/agreements/:id', requireAuth, agreementController.getAgreementDetail);

router.get(
  '/agreements/:id/payments',
  requireAuth,
  agreementController.listAgreementPayments
);

router.post(
  '/agreements/:id/accept',
  requireAuth,
  restrictTo('renter', 'admin'),
  agreementController.acceptAgreement
);

router.post(
  '/agreements/:id/reject',
  requireAuth,
  restrictTo('renter', 'admin'),
  validate(rejectAgreementSchema),
  agreementController.rejectAgreement
);

router.post(
  '/agreements/:id/cancel',
  requireAuth,
  restrictTo('renter', 'owner', 'admin'),
  validate(cancelAgreementSchema),
  agreementController.cancelAgreement
);

router.post(
  '/agreements/:id/deposit/initiate',
  requireAuth,
  restrictTo('renter', 'admin'),
  agreementController.initiateDeposit
);

router.get(
  '/agreements/:id/deposit/status',
  requireAuth,
  restrictTo('renter', 'admin'),
  agreementController.getDepositStatus
);

router.post(
  '/agreements/:id/terminate',
  requireAuth,
  restrictTo('owner', 'admin'),
  agreementController.terminateAgreement
);

export default router;
