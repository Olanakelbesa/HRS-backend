import { Router } from 'express';
import * as appointmentController from './controller';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     summary: Book a property visit (renter)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', restrictTo('renter'), appointmentController.book);

/**
 * @swagger
 * /api/v1/appointments/me:
 *   get:
 *     summary: List logged-in renter's appointments
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, CANCELLED]
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 */
router.get('/me', restrictTo('renter'), appointmentController.listMine);

/**
 * @swagger
 * /api/v1/appointments:
 *   get:
 *     summary: View appointment schedule (role-scoped)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', appointmentController.list);

/**
 * @swagger
 * /api/v1/appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel appointment (renter, own booking only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/cancel', restrictTo('renter'), appointmentController.cancel);

/**
 * @swagger
 * /api/v1/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status (owner)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', appointmentController.updateStatus);

/**
 * @swagger
 * /api/v1/appointments/{id}/note:
 *   patch:
 *     summary: Update appointment note (owner)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/note', appointmentController.updateNote);

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   get:
 *     summary: Get appointment details
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', appointmentController.getById);

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   patch:
 *     summary: Update appointment status (approve / reject / cancel)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', appointmentController.patchById);

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   delete:
 *     summary: Delete appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', appointmentController.remove);

export default router;
