import { NextFunction, Request, Response } from 'express';
import stripe from 'stripe';
import Joi from 'joi';
import { fetchCartFromTransactionId, updateCart } from '../../operations/carts';
import { Error, TransactionState } from '../../types';
import { notFound, success } from '../../utils/responses';
import { validateBody } from '../../middlewares/validation';

// This route is a webhook called by stripe
// To test it, first create an account on stripe, and install the stripe cli (https://docs.stripe.com/stripe-cli). Then, you can run the command :
// stripe listen --forward-to localhost:3000/stripe/accepted --events checkout.session.expired
// Small tip I discovered a bit later than I would have liked to : you can resend an event with
// stripe events resend <eventId>
// You can find the eventId at https://dashboard.stripe.com/test/workbench/webhooks
export default [
  validateBody(
    Joi.object({
      object: Joi.equal('event').required(),
      type: Joi.equal('checkout.session.expired').required(),
      data: Joi.object({
        object: Joi.object({
          object: Joi.equal('checkout.session').required(),
          id: Joi.string().required(),
        }).unknown(true),
      }),
    }).unknown(true),
  ),

  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const session = request.body.data.object as stripe.Checkout.Session;

      // Fetch the cart from the cartId
      const cart = await fetchCartFromTransactionId(session.id);

      // If the cart wasn't found, return a 404
      if (!cart) {
        return notFound(response, Error.CartNotFound);
      }

      // If the transaction is already errored or paid (probably forced-pay, else that's strange), simply return.
      if (cart.transactionState !== TransactionState.pending) {
        return success(response, { api: 'ok' });
      }

      // Update the cart with the callback data
      await updateCart(cart.id, session.id, TransactionState.expired);

      return success(response, { api: 'ok' });
    } catch (error) {
      return next(error);
    }
  },
];
