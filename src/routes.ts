import { Router } from 'express';
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import propertyRoutes from './modules/properties/routes';

const router = Router();

// Auth Routes
router.use('/auth', authRoutes);

// User Routes
router.use('/users', userRoutes);

// Property Routes
router.use('/properties', propertyRoutes);

export default router;
