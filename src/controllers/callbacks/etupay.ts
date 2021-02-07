import { TransactionState } from '@prisma/client';
import { ErrorRequestHandler, NextFunction, request, Request, Response } from 'express';
import { fetchCart, updateCart } from '../../operations/carts';
import { sendTickets } from '../../services/email';
import * as etupay from '../../services/etupay';
import { Error, EtupayError, EtupayResponse } from '../../types';
import env from '../../utils/env';
import { decodeFromBase64 } from '../../utils/helpers';
import { badRequest, forbidden, notFound, success } from '../../utils/responses';

// Called by the client
export const clientCallback = [
  // Use the middleware to decrypt the data
  etupay.middleware,

  // Create a small middleware to be able to handle payload errors.
  (error: EtupayError, request: Request, response: Response, next: NextFunction) => {
    return badRequest(response, Error.InvalidQueryParameters);
  },

  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let etupayResponse: EtupayResponse;

      // Retreive the base64 payload
      etupayResponse = response.locals.etupay;

      // Decode the base64 string to an object
      const decoded = decodeFromBase64(etupayResponse.serviceData);
      const cartId = decoded.cartId;

      // Fetch the cart from the cartId
      const cart = await fetchCart(cartId);

      // If the cart wasn't found, return a 404
      if (!cart) {
        return notFound(response, Error.CartNotFound);
      }

      // If the transaction is already paid
      if (cart.transactionState === TransactionState.paid) {
        return forbidden(response, Error.AlreadyPaid);
      }

      // If the transaction is already errored
      if (cart.transactionState !== TransactionState.pending) {
        return forbidden(response, Error.AlreadyErrored);
      }

      // Update the cart with the callback data
      const updatedCart = await updateCart(cartId, etupayResponse.transactionId, etupayResponse.step);

      // If the transaction state wasn't paid, redirect to the error url
      if (etupayResponse.step !== TransactionState.paid) {
        return response.redirect(env.etupay.errorUrl);
      }

      // Send the tickets to the user. We do not await this function to have the redirection imediately
      sendTickets(updatedCart);

      return response.redirect(env.etupay.successUrl);
    } catch (error) {
      return next(error);
    }
  },
];

// Called by the bank few minutes after
export const bankCallback = (request: Request, response: Response) => success(response, { api: 'ok' });
