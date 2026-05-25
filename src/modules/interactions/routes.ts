import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireServiceAuth } from '../../middlewares/serviceAuth.middleware';
import * as interactionController from './controller';

const router = Router();

router.post('/view', requireAuth, interactionController.recordView);
router.post('/like', requireAuth, interactionController.likeProperty);
router.delete('/like', requireAuth, interactionController.unlikeProperty);
router.post('/save', requireAuth, interactionController.saveProperty);
router.delete('/save', requireAuth, interactionController.unsaveProperty);
router.post('/contact', requireAuth, interactionController.recordContact);
router.post('/share', requireAuth, interactionController.recordShare);
router.post('/schedule', requireAuth, interactionController.recordSchedule);
router.get('/property/:propertyId/state', requireAuth, interactionController.getPropertyState);
router.get('/history', requireAuth, interactionController.getHistory);
router.get(
  '/export/user/:userId',
  requireServiceAuth,
  interactionController.exportUserEvents
);

export default router;
