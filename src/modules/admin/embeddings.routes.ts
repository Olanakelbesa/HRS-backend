import { Router } from 'express';
import { resyncEmbeddingsController } from './embeddings.controller';
import { requireAdmin } from '../auth/requireAdmin';

/**
 * @swagger
 * /admin/embeddings/resync:
 *   post:
 *     summary: Resync all property embeddings
 *     description: Fetches all properties, regenerates their embeddings via the embedding service, and upserts them into the PropertyEmbedding table. This operation is safe to call multiple times.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Embedding resync completed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Embedding resync completed
 *                 total:
 *                   type: integer
 *                   example: 300
 *                 success:
 *                   type: integer
 *                   example: 300
 *                 failed:
 *                   type: integer
 *                   example: 0
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       propertyId:
 *                         type: string
 *                         example: "clx1m2qrb0000j2a6v2u8w3x4"
 *                       error:
 *                         type: string
 *                         example: "Embedding failed: some error message"
 *       403:
 *         description: Forbidden, only admin users can access this endpoint.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Internal server error during embedding resync.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Embedding resync failed
 *                 error:
 *                   type: string
 *                   example: "Error message details"
 */

const router = Router();

router.post('/embeddings/resync', requireAdmin, resyncEmbeddingsController);

export default router;
