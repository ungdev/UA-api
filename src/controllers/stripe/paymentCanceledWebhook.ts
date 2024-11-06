import { NextFunction, Request, Response } from 'express';
import { updateCart } from '../../operations/carts';
import { sendMailsFromTemplate } from '../../services/email';
import { TransactionState } from '../../types';
import { success } from '../../utils/responses';
import { paymentIntentWebhookMiddleware } from '../../utils/stripe';
import logger from '../../utils/logger';

// See src/controllers/stripe/index.ts
export default [
  ...paymentIntentWebhookMiddleware('canceled'),

  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { cart } = response.locals;

      // If the transaction is already errored (force-payed, directly changed in database, ...)
      if (![TransactionState.pending, TransactionState.processing].includes(cart.transactionState)) {
        logger.warn(
          `A transaction with state ${cart.transactionState} has received the webhook 'payment_intent.canceled' by Stripe.`,
        );
        return success(response, { api: 'ok' });
      }

      // Update the cart with the callback data
      const updatedCart = await updateCart(cart.id, { transactionState: TransactionState.canceled });
      await sendMailsFromTemplate('orderconfirmation', [updatedCart]);

      return success(response, { api: 'ok' });
    } catch (error) {
      return next(error);
    }
  },
];
