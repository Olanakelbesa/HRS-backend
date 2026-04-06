import { Router } from 'express';

const router = Router();
import { createPropertyController } from './controller';
import { createPropertySchema } from './schema';
import { validate } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth.middleware';
import { getPropertiesSchema } from './schema';
import { getPropertiesController } from './controller';
import { getPropertyByIdSchema } from './schema';
import { getPropertyByIdController } from './controller';
import { updatePropertySchema } from './schema';
import { updatePropertyController } from './controller';
import { deletePropertySchema } from './schema';
import { deletePropertyController } from './controller';
import { getMyPropertiesController } from './controller';
import { updatePropertyStatusSchema } from './schema';
import { updatePropertyStatusController } from './controller';
/**
 * @openapi
 * tags:
 *   - name: Property
 *     description: Property listing and management endpoints
 */

/**
 * @openapi
 * /api/v1/properties:
 *   get:
 *     summary: Get all properties (listing)
 *     tags: [Property]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 12
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, pending, rented, unavailable]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [VILLA, APARTMENT, CONDOMINIUM, SERVICES, PRIVATE_COMPOUND]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         example: 10000
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         example: 50000
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *         example: 2
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, price, viewsCount]
 *         example: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         example: desc
 *     responses:
 *       200:
 *         description: Properties fetched successfully
 */
router.get('/', validate(getPropertiesSchema, 'query'), getPropertiesController);

/**
 * @openapi
 * /api/v1/properties/{propertyId}:
 *   get:
 *     summary: Get property details by ID
 *     tags: [Property]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         example: "ckv1n1xyz"
 *     responses:
 *       200:
 *         description: Property fetched successfully
 *       404:
 *         description: Property not found
 */
router.get('/:propertyId', validate(getPropertyByIdSchema, 'params'), getPropertyByIdController);

/**
 * @openapi
 * /api/v1/properties:
 *   post:
 *     summary: Create a new property (Owner only)
 *     tags: [Property]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - location
 *               - price
 *               - amenities
 *               - images
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [VILLA, APARTMENT, CONDOMINIUM, SERVICES, PRIVATE_COMPOUND]
 *               title:
 *                 type: object
 *                 example: { "en": "Modern Apartment", "am": "ዘመናዊ አፓርታማ" }
 *               description:
 *                 type: object
 *                 example: { "en": "Nice house", "am": "ጥሩ ቤት" }
 *               location:
 *                 type: string
 *                 example: "POINT(38.7578 9.0300)"
 *               address:
 *                 type: string
 *                 example: "Bole, Addis Ababa"
 *               price:
 *                 type: number
 *                 example: 35000
 *               bedrooms:
 *                 type: integer
 *                 example: 2
 *               bathrooms:
 *                 type: integer
 *                 example: 1
 *               area:
 *                 type: number
 *                 example: 120
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["wifi", "parking"]
 *               furnishingType:
 *                 type: string
 *                 example: "furnished"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://img.com/1.jpg"]
 *     responses:
 *       201:
 *         description: Property created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireAuth, validate(createPropertySchema, 'body'), createPropertyController);

/**
 * @openapi
 * /api/v1/properties/{propertyId}:
 *   patch:
 *     summary: Update property (Owner only)
 *     tags: [Property]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Property updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 */
router.patch(
  '/:propertyId',
  requireAuth,
  validate(updatePropertySchema, 'body'),
  updatePropertyController
);

/**
 * @openapi
 * /api/v1/properties/{propertyId}:
 *   delete:
 *     summary: Soft delete property (Owner only)
 *     tags: [Property]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property soft deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 */
router.delete(
  '/:propertyId',
  requireAuth,
  validate(deletePropertySchema, 'params'),
  deletePropertyController
);

/**
 * @openapi
 * /api/v1/properties/my:
 *   get:
 *     summary: Get properties created by logged-in owner
 *     tags: [Property]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner properties fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my', requireAuth, getMyPropertiesController);

/**
 * @openapi
 * /api/v1/properties/{propertyId}/status:
 *   patch:
 *     summary: Update property status (Owner only)
 *     tags: [Property]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, pending, rented, unavailable]
 *                 example: rented
 *     responses:
 *       200:
 *         description: Property status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 */
router.patch(
  '/:propertyId/status',
  requireAuth,
  validate(updatePropertyStatusSchema, 'body'),
  updatePropertyStatusController
);

export default router;
