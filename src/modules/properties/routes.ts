import { Router } from 'express';
import * as propertyController from './controller';

const router = Router();

/**
 * @swagger
 * /api/v1/properties:
 *   get:
 *     summary: List properties
 *     tags: [Properties]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of properties
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiDataEnvelope'
 */
router.get('/', propertyController.list);

/**
 * @swagger
 * /api/v1/properties/health:
 *   get:
 *     summary: Properties module health check
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/health', (_, res) => res.json({ status: 'ok', module: 'properties' }));

/**
 * @swagger
 * /api/v1/properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     tags: [Properties]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiDataEnvelope'
 *       404:
 *         description: Not found
 */
router.get('/:id', propertyController.getById);

export default router;
