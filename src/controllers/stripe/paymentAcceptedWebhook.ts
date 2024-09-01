import { NextFunction, Request, Response } from 'express';
import stripe from 'stripe';
import Joi from 'joi';
import { fetchCartFromTransactionId, updateCart } from '../../operations/carts';
import { sendPaymentConfirmation } from '../../services/email';
import { Error, EtupayError, TransactionState } from '../../types';
import { badRequest, forbidden, notFound, success } from '../../utils/responses';
import { validateBody } from '../../middlewares/validation';

// This route is a webhook called by stripe
// To test it, first create an account on stripe, and install the stripe cli (https://docs.stripe.com/stripe-cli). Then, you can run the command :
// stripe listen --forward-to localhost:3000/stripe/accepted --events checkout.session.completed
// Small tip I discovered a bit later than I would have liked to : you can resend an event with
// stripe events resend <eventId>
// You can find the eventId at https://dashboard.stripe.com/test/workbench/webhooks
export default [
  validateBody(
    Joi.object({
      object: Joi.equal('event').required(),
      type: Joi.equal('checkout.session.completed').required(),
      data: Joi.object({
        object: Joi.object({
          object: Joi.equal('checkout.session').required(),
          id: Joi.string().required(),
        }).unknown(true),
      }),
    }).unknown(true),
  ),

  // Create a small middleware to be able to handle payload errors.
  // The eslint disabling is important because the error argument can only be gotten in the 4 arguments function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: EtupayError, request: Request, response: Response, next: NextFunction) =>
    badRequest(response, Error.InvalidQueryParameters),

  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const session = request.body.data.object as stripe.Checkout.Session;

      // Fetch the cart from the cartId
      const cart = await fetchCartFromTransactionId(session.id);

      // If the cart wasn't found, return a 404
      if (!cart) {
        return notFound(response, Error.CartNotFound);
      }

      // If the transaction is already paid
      if (cart.transactionState === TransactionState.paid) {
        return forbidden(response, Error.CartAlreadyPaid);
      }

      // If the transaction is already errored
      if (cart.transactionState !== TransactionState.pending) {
        return forbidden(response, Error.AlreadyErrored);
      }

      // Update the cart with the callback data
      const updatedCart = await updateCart(cart.id, session.id, TransactionState.paid);
      await sendPaymentConfirmation(updatedCart);

      return success(response, { api: 'ok' });
    } catch (error) {
      return next(error);
    }
  },
];
