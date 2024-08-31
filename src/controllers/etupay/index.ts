import { Router } from 'express';
import { etupayClientCallback, bankCallback as etupayBankCallback, stripeWebhook } from "./callback";

const router = Router();

router.get('/callback', etupayClientCallback);
router.post('/callback', etupayBankCallback);
router.post('/stripe/paymentAccepted', stripeWebhook);

export default router;
