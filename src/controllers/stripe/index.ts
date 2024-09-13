import { Router } from 'express';
import paymentSucceededWebhook from './paymentSucceededWebhook';
import paymentCanceledWebhook from './paymentCanceledWebhook';
import paymentProcessingWebhook from './paymentProcessingWebhook';

const router = Router();

// These routes are webhooks called by Stripe
// To test them, first create an account on stripe, and install the stripe cli (https://docs.stripe.com/stripe-cli). Then, you can run the command :
// stripe listen --forward-to localhost:3000/stripe/accepted --events <event.type>
// You have to replace <event.type> by the value expected by the `type` parameter
// Small tip I discovered a bit later than I would have liked to : you can resend an event with
// stripe events resend <eventId>
// You can find the eventId at https://dashboard.stripe.com/test/workbench/webhooks
router.post('/succeeded', paymentSucceededWebhook);
router.post('/canceled', paymentCanceledWebhook);
router.post('/processing', paymentProcessingWebhook);

export default router;
