import { Router } from 'express';
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import profileRoutes from './modules/profile/routes';
import propertyRoutes from './modules/properties/routes';
import messagingRoutes from './modules/messaging/routes';
import appointmentRoutes from './modules/appointments/routes';
import notificationRoutes from './modules/notifications/routes';
import adminRoutes from './modules/admin/routes';
import reviewRoutes from './modules/review-rate/routes';
import paymentRoutes from './modules/payments/routes';
import agreementRoutes from './modules/agreements/routes';
import recommendationRoutes from './modules/recommendation/routes';
import recommendationController from './modules/recommendation/controller';
import searchRoutes from './modules/search/routes';
import { requireAuth, restrictTo } from './middlewares/auth.middleware';
import { validate } from './middlewares/validate';
import { preferenceSchema, searchSchema, interactionSchema } from './modules/recommendation/schema';
import reportRoutes from './modules/reports/routes';
import verificationRoutes from './modules/verification/routes';
import ownerRoutes from './modules/owner/routes';
import interactionRoutes from './modules/interactions/routes';
import * as appointmentController from './modules/appointments/controller';
import { listAppointmentsQuerySchema } from './modules/appointments/schema';
import internalRoutes from './modules/internal/routes';

const router = Router();

// Auth Routes
router.use('/auth', authRoutes);

// User Routes
router.use('/users', userRoutes);

// Profile Routes
router.use('/profile', profileRoutes);

// Property Routes
router.use('/properties', propertyRoutes);

// Semantic Search Routes
router.use('/search', searchRoutes);

// Messaging Routes
router.use('/messaging', messagingRoutes);

// Appointment Routes
router.use('/appointments', appointmentRoutes);

// Notification Routes
router.use('/notifications', notificationRoutes);

// Admin Routes
router.use('/admin', adminRoutes);

//Review Routes
router.use('/reviews', reviewRoutes);

//Recommendation Routes
router.use('/recommendation', recommendationRoutes);

// Renter interaction tracking (event-sourced)
router.use('/interactions', interactionRoutes);

// Renter-scoped preferences endpoint used by onboarding/profile flows.
// Preferences are only available to renter accounts.
router.post(
  '/renter/preferences',
  requireAuth,
  restrictTo('renter'),
  validate(preferenceSchema),
  recommendationController.savePreferences as any
);
router.patch(
  '/renter/preferences',
  requireAuth,
  restrictTo('renter'),
  validate(preferenceSchema),
  recommendationController.updatePreferences as any
);
router.get(
  '/renter/preferences',
  requireAuth,
  restrictTo('renter'),
  recommendationController.getPreferences as any
);

// Backwards-compatible search history endpoints at /search/history
router.post(
  '/search/history',
  requireAuth,
  validate(searchSchema),
  recommendationController.saveSearch as any
);
router.get('/search/history', requireAuth, recommendationController.getSearchHistory as any);

// Backwards-compatible interactions endpoint at /interactions
router.post(
  '/interactions',
  requireAuth,
  validate(interactionSchema),
  recommendationController.trackInteraction as any
);

// Backwards-compatible similar properties endpoint at /properties/:id/similar
router.get(
  '/properties/:id/similar',
  requireAuth,
  recommendationController.getSimilarProperties as any
);
//Reports Routes
router.use('/reports', reportRoutes);

// Payment Routes
router.use('/payments', paymentRoutes);

// Verification Routes
router.use('/verification', verificationRoutes);

// Owner dashboard (register before catch-all agreement mounts)
router.get(
  '/owner/appointments',
  requireAuth,
  restrictTo('owner', 'admin'),
  validate(listAppointmentsQuerySchema, 'query'),
  appointmentController.list
);
router.use('/owner', ownerRoutes);

// Internal Microservices Integration
router.use('/internal', internalRoutes);

// Agreements (also exposes GET /owner/overview for older deploys)
router.use('/', agreementRoutes);

export default router;
