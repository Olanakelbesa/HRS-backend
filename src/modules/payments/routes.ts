import { Router } from 'express';
import * as paymentController from './controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { memoryUpload } from '../../middlewares/multer.middleware';
import { validate } from '../../middlewares/validate';
import { chapaVerifySchema } from './schema';

const router = Router();

router.post('/chapa/webhook', paymentController.chapaWebhook);
router.get('/chapa/callback', paymentController.chapaCallback);

router.use(requireAuth);

router.get('/', paymentController.listPayments);
router.get('/summary', paymentController.getPaymentSummary);
router.get('/export', paymentController.exportPayments);
router.post('/chapa/verify', validate(chapaVerifySchema), paymentController.chapaVerify);

router.get('/:id/proof', paymentController.getPaymentProof);
router.post('/:id/proof', memoryUpload.single('file'), paymentController.uploadPaymentProof);
router.patch('/:id/confirm', paymentController.confirmPayment);

export default router;
