import { Router } from "express";
import reviewController from "./controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import { createReviewSchema, updateReviewSchema } from "./schema";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Property review management
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
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
 *               - rating
 *               - comment
 *             properties:
 *               propertyId:
 *                 type: string
 *                 example: "cku123abc"
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: "Very clean and well located property."
 *     responses:
 *       201:
 *         description: Review created successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  requireAuth,
  validate(createReviewSchema),
  reviewController.create
);

/**
 * @swagger
 * /reviews/property/{propertyId}:
 *   get:
 *     summary: Get all reviews for a property
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of property reviews
 */
router.get("/property/:propertyId", reviewController.getPropertyReviews);

/**
 * @swagger
 * /reviews/me:
 *   get:
 *     summary: Get logged-in user's reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user reviews
 *       401:
 *         description: Unauthorized
 */
router.get("/me", requireAuth, reviewController.getMyReviews);

/**
 * @swagger
 * /reviews/{reviewId}:
 *   patch:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
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
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/:reviewId",
  requireAuth,
  validate(updateReviewSchema),
  reviewController.update
);

/**
 * @swagger
 * /reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete("/:reviewId", requireAuth, reviewController.remove);

/**
 * @swagger
 * /reviews/property/{propertyId}/stats:
 *   get:
 *     summary: Get review statistics for a property
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property review statistics
 */
router.get(
  "/property/:propertyId/stats",
  reviewController.getPropertyStats
);

export default router;