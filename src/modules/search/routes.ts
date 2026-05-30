import { Router } from 'express';
import { searchPropertiesController } from './controller';

const router = Router();

/**
 * @openapi
 * /api/v1/search:
 *   get:
 *     summary: Semantically search properties using natural language
 *     tags: [Property]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         example: "cheap modern 2 bedroom near Bole with gym"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [ETB, USD]
 *           default: ETB
 *         description: Preferred currency for price display (amountEtb always included)
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.get('/', searchPropertiesController);

export default router;
