import { Router } from "express";
import reviewController from "./controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate";
import { createReviewSchema, updateReviewSchema, replyReviewSchema } from "./schema";
import { z } from "zod";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Property review management
 */

/**
 * @swagger
 * /api/v1/reviews:
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
 * /api/v1/reviews/property/{propertyId}:
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
 * /api/v1/reviews/me:
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
 * /api/v1/reviews/{reviewId}:
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
  validate(z.object({ reviewId: z.string() }), "params"), // 👈 validate params
  validate(updateReviewSchema, "body"),                  // 👈 validate body
  reviewController.update
);
/**
 * @swagger
 * /api/v1/reviews/{reviewId}:
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
 * /api/v1/reviews/property/{propertyId}/stats:
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

/**
 * @swagger
 * /api/v1/reviews/owner:
 *   get:
 *     summary: Get all reviews for properties owned by the logged-in user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: List of owner's property reviews
 *       401:
 *         description: Unauthorized
 */
router.get("/owner", requireAuth, reviewController.getOwnerReviews);

/**
 * @swagger
 * /api/v1/reviews/owner/stats:
 *   get:
 *     summary: Get aggregated review stats for all properties owned by the logged-in user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner review statistics
 *       401:
 *         description: Unauthorized
 */
router.get("/owner/stats", requireAuth, reviewController.getOwnerStats);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}/reply:
 *   patch:
 *     summary: Reply to a review (property owner only)
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
 *             required:
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Review reply updated
 *       403:
 *         description: Not authorized to reply to this review
 *       404:
 *         description: Review not found
 */
router.patch(
  "/:reviewId/reply",
  requireAuth,
  validate(z.object({ reviewId: z.string() }), "params"),
  validate(replyReviewSchema, "body"),
  reviewController.replyToReview
);

export default router;