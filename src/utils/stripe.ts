import Stripe from 'stripe';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import env from './env';
import { validateBody } from '../middlewares/validation';
import { notFound, unauthenticated } from './responses';
import { Error } from '../types';
import { fetchCartFromTransactionId } from '../operations/carts';

export const stripe = new Stripe(env.stripe.token);

export function paymentIntentWebhookMiddleware(eventType: 'processing' | 'canceled' | 'succeeded') {
  return [
    validateBody(
      Joi.object({
        object: Joi.equal('event').required(),
        type: Joi.equal(`payment_intent.${eventType}`).required(),
        data: Joi.object({
          object: Joi.object({
            object: Joi.equal('payment_intent').required(),
            id: Joi.string().required(),
          }).unknown(true),
        }),
      }).unknown(true),
    ),

    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const paymentIntent = request.body.data.object as Stripe.PaymentIntent;
        // Fetch the cart from the cartId
        const cart = await fetchCartFromTransactionId(paymentIntent.id);
        // If the cart wasn't found, return a 404
        if (!cart) {
          return notFound(response, Error.CartNotFound);
        }
        response.locals.cart = cart;
        if ((await stripe.paymentIntents.retrieve(paymentIntent.id)).status !== eventType) {
          return unauthenticated(response, Error.PleaseDontPlayWithStripeWebhooks);
        }
        return next();
      } catch (error) {
        return next(error);
      }
    },
  ];
}
