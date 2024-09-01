import { Router } from 'express';
import paymentAcceptedWebhook from "./paymentAcceptedWebhook";

const router = Router();

router.post('/accepted', paymentAcceptedWebhook);

export default router;
