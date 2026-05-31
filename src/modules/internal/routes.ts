import { Router } from 'express';
import { getRecommendationData } from './controller';

const router = Router();

// Endpoint intended for internal microservice data fetching
router.get('/recommendation-data', getRecommendationData as any);

export default router;
