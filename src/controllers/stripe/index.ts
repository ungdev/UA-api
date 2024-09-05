import { Router } from 'express';
import paymentAcceptedWebhook from './paymentAcceptedWebhook';
import paymentExpiredWebhook from './paymentExpiredWebhook';

const router = Router();

router.post('/accepted', paymentAcceptedWebhook);
router.post('/expired', paymentExpiredWebhook);

export default router;
