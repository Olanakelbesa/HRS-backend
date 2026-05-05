import { Router } from 'express';
import controller from './controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate';
import { preferenceSchema, searchSchema, interactionSchema } from './schema';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Recommendation
 *     description: User preferences, search history, interactions, and recommendations
 */

/**
 * @openapi
 * /api/v1/user/preferences:
 *   post:
 *     summary: Save user preferences
 *     tags: [Recommendation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferredLocations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     city:
 *                       type: string
 *                       example: "Seattle"
 *                     state:
 *                       type: string
 *                       example: "WA"
 *                     lat:
 *                       type: number
 *                       example: 47.6062
 *                     lng:
 *                       type: number
 *                       example: -122.3321
 *               budget:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     example: 800
 *                   max:
 *                     type: number
 *                     example: 1600
 *               bedrooms:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: integer
 *                     example: 1
 *                   max:
 *                     type: integer
 *                     example: 2
 *               bathrooms:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: integer
 *                     example: 1
 *                   max:
 *                     type: integer
 *                     example: 2
 *               petsAllowed:
 *                 type: boolean
 *                 example: true
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["parking", "in-unit-laundry", "dishwasher"]
 *               furnished:
 *                 type: boolean
 *                 example: false
 *               moveInDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-06-01T00:00:00.000Z"
 *               leaseLengthMonths:
 *                 type: integer
 *                 example: 12
 *               searchRadiusKm:
 *                 type: number
 *                 example: 10
 *               commuteMinutes:
 *                 type: number
 *                 example: 45
 *               smokingAllowed:
 *                 type: boolean
 *                 example: false
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["en"]
 *               notes:
 *                 type: string
 *                 example: "Prefer quiet buildings near transit"
 *               preferredType:
 *                 type: string
 *                 enum: [VILLA, APARTMENT, CONDO, STUDIO, HOUSE]
 *     responses:
 *       200:
 *         description: Preferences saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferredLocations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                       state:
 *                         type: string
 *                       lat:
 *                         type: number
 *                       lng:
 *                         type: number
 *                 budget:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *                 bedrooms:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: integer
 *                     max:
 *                       type: integer
 *                 bathrooms:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: integer
 *                     max:
 *                       type: integer
 *                 petsAllowed:
 *                   type: boolean
 *                 amenities:
 *                   type: array
 *                   items:
 *                     type: string
 *                 furnished:
 *                   type: boolean
 *                 moveInDate:
 *                   type: string
 *                   format: date-time
 *                 leaseLengthMonths:
 *                   type: integer
 *                 searchRadiusKm:
 *                   type: number
 *                 commuteMinutes:
 *                   type: number
 *                 smokingAllowed:
 *                   type: boolean
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: string
 *                 notes:
 *                   type: string
 *                 preferredType:
 *                   type: string
 */
router.post(
  '/user/preferences',
  requireAuth,
  validate(preferenceSchema),
  controller.savePreferences
);

/**
 * @openapi
 * /api/v1/user/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Recommendation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferredLocations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                       state:
 *                         type: string
 *                       lat:
 *                         type: number
 *                       lng:
 *                         type: number
 *                 budget:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *                 bedrooms:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: integer
 *                     max:
 *                       type: integer
 *                 bathrooms:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: integer
 *                     max:
 *                       type: integer
 *                 petsAllowed:
 *                   type: boolean
 *                 amenities:
 *                   type: array
 *                   items:
 *                     type: string
 *                 furnished:
 *                   type: boolean
 *                 moveInDate:
 *                   type: string
 *                   format: date-time
 *                 leaseLengthMonths:
 *                   type: integer
 *                 searchRadiusKm:
 *                   type: number
 *                 commuteMinutes:
 *                   type: number
 *                 smokingAllowed:
 *                   type: boolean
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: string
 *                 notes:
 *                   type: string
 *                 preferredType:
 *                   type: string
 */
router.get('/user/preferences', requireAuth, controller.getPreferences);

/**
 * @openapi
 * /api/v1/search/history:
 *   post:
 *     summary: Save search history
 *     tags: [Recommendation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 example: "2 bedroom apartment"
 *               filters:
 *                 type: object
 *                 example: { "minPrice": 10000, "maxPrice": 30000 }
 *     responses:
 *       200:
 *         description: Search saved successfully
 */
router.post('/search/history', requireAuth, validate(searchSchema), controller.saveSearch);

/**
 * @openapi
 * /api/v1/search/history:
 *   get:
 *     summary: Get search history
 *     tags: [Recommendation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search history fetched successfully
 */
router.get('/search/history', requireAuth, controller.getSearchHistory);

/**
 * @openapi
 * /api/v1/interactions:
 *   post:
 *     summary: Track user interaction (view, like, save)
 *     tags: [Recommendation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - type
 *             properties:
 *               propertyId:
 *                 type: string
 *                 example: "ck123property"
 *               type:
 *                 type: string
 *                 enum: [VIEW, LIKE, SAVE]
 *                 example: VIEW
 *     responses:
 *       200:
 *         description: Interaction recorded successfully
 */
router.post('/interactions', requireAuth, validate(interactionSchema), controller.trackInteraction);

/**
 * @openapi
 * /api/v1/properties/recommendations:
 *   get:
 *     summary: Get recommended properties for logged-in user
 *     tags: [Recommendation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended properties fetched successfully
 */
router.get('/properties/recommendations', requireAuth, controller.getRecommendations);

/**
 * @openapi
 * /api/v1/properties/{id}/similar:
 *   get:
 *     summary: Get similar properties
 *     tags: [Recommendation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "ck123property"
 *     responses:
 *       200:
 *         description: Similar properties fetched successfully
 */
router.get('/properties/:id/similar', requireAuth, controller.getSimilarProperties);

export default router;
