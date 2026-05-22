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
