import { Router } from 'express';
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import propertyRoutes from './modules/properties/routes';
import messagingRoutes from './modules/messaging/routes';
import appointmentRoutes from './modules/appointments/routes';
import notificationRoutes from './modules/notifications/routes';
import adminRoutes from './modules/admin/routes';
import reviewRoutes from './modules/review-rate/routes';
import recommendationRoutes from "./modules/recommendation/routes";

const router = Router();

// Auth Routes
router.use('/auth', authRoutes);

// User Routes
router.use('/users', userRoutes);

// Property Routes
router.use('/properties', propertyRoutes);

// Messaging Routes
router.use('/messaging', messagingRoutes);

// Appointment Routes
router.use('/appointments', appointmentRoutes);

// Notification Routes
router.use('/notifications', notificationRoutes);

// Admin Routes
router.use('/admin', adminRoutes);

//Review Routes
router.use('/review', reviewRoutes);

//RecommendationRoute
router.use("/recommend", recommendationRoutes);

export default router;
