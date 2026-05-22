import { Router } from 'express';
import * as userController from './controller';
import { requireAuth, restrictTo } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserEnvelope'
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserEnvelope'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', requireAuth, userController.getProfile);
router.patch('/profile', requireAuth, userController.updateProfile);
router.patch('/change-password', requireAuth, userController.changePassword);
router.get('/:id', userController.getOwnerProfile);
/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get public owner profile with listings and reviews
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner user id
 *     responses:
 *       200:
 *         description: Owner profile loaded successfully
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
 *                     owner:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         role:
 *                           type: string
 *                         location:
 *                           type: string
 *                         joinedDate:
 *                           type: string
 *                         verification:
 *                           type: object
 *                           properties:
 *                             idVerified:
 *                               type: boolean
 *                             phoneVerified:
 *                               type: boolean
 *                         propertiesManaged:
 *                           type: integer
 *                         rating:
 *                           type: object
 *                           properties:
 *                             average:
 *                               type: number
 *                             reviewCount:
 *                               type: integer
 *                     listings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           location:
 *                             type: string
 *                           price:
 *                             type: number
 *                           image:
 *                             type: string
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           reviewerName:
 *                             type: string
 *                           date:
 *                             type: string
 *                           rating:
 *                             type: integer
 *                           comment:
 *                             type: string
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Owner not found
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/v1/users/change-password:
 *   patch:
 *     summary: Change current user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/change-password', userController.changePassword);
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  requireAuth,
  restrictTo('ADMIN'),
  userController.getAllUsers
);

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   patch:
 *     summary: Update user role (Admin only)
 *     tags: [Users]
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
 *               role:
 *                 type: string
 *                 enum: [RENTER, OWNER, ADMIN]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
  '/:id/role',
  requireAuth,
  restrictTo('ADMIN'),
  userController.updateUserRole
);
/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate user (Admin only)
 *     tags: [Users]
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
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated
 */
router.patch(
  '/:id/status',
  requireAuth,
  restrictTo('ADMIN'),
  userController.updateUserStatus
);

export default router;
