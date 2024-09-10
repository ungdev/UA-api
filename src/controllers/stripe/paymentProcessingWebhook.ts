import { NextFunction, Request, Response } from 'express';
import { updateCart } from '../../operations/carts';
import { TransactionState } from '../../types';
import { success } from '../../utils/responses';
import { paymentIntentWebhookMiddleware } from '../../utils/stripe';
import logger from '../../utils/logger';

// See src/controllers/stripe/index.ts
export default [
  ...paymentIntentWebhookMiddleware('processing'),

  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { cart } = response.locals;

      // If the transaction is already errored or paid (probably forced-pay, else that's strange), simply return.
      if (cart.transactionState !== TransactionState.pending) {
        logger.warn(
          `A transaction with state ${cart.transactionState} has received the webhook 'payment_intent.processing' by Stripe.`,
        );
        return success(response, { api: 'ok' });
      }

      // Update the cart with the callback data
      await updateCart(cart.id, { transactionState: TransactionState.processing, succeededAt: new Date(Date.now()) });

      return success(response, { api: 'ok' });
    } catch (error) {
      return next(error);
    }
  },
];
