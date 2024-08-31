import { NextFunction, Request, Response } from 'express';
import stripe from 'stripe';
import { fetchCartFromTransactionId, updateCart } from '../../operations/carts';
import { sendPaymentConfirmation } from '../../services/email';
import * as etupay from '../../services/etupay';
import { Error, EtupayError, TransactionState } from '../../types';
import { badRequest, forbidden, notFound, success } from '../../utils/responses';

// Called by the client
export const etupayClientCallback = [
  (request: Request, response: Response) => badRequest(response, Error.ObsoleteRoute),

  // Use the middleware to decrypt the data
  etupay.middleware,

  // Create a small middleware to be able to handle payload errors.
  // The eslint disabling is important because the error argument can only be gotten in the 4 arguments function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: EtupayError, request: Request, response: Response, next: NextFunction) =>
    badRequest(response, Error.InvalidQueryParameters),
  /*
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // Retreive the base64 payload
      const etupayResponse = response.locals.etupay as EtupayResponse;

      // Decode the base64 string to an object
      const decoded = decodeFromBase64(etupayResponse.serviceData);
      const { cartId } = decoded;

      // Fetch the cart from the cartId
      const cart = await fetchCart(cartId);

      // If the cart wasn't found, return a 404
      if (!cart) {
        return notFound(response, Error.CartNotFound);
      }

      // If the transaction is already paid
      if (cart.transactionState === TransactionState.paid || cart.transactionState === TransactionState.authorization) {
        return forbidden(response, Error.AlreadyPaid);
      }

      // If the transaction is already errored
      if (cart.transactionState !== TransactionState.pending) {
        return forbidden(response, Error.AlreadyErrored);
      }

      // Update the cart with the callback data
      await updateCart(
        cartId,
        etupayResponse.transactionId,
        etupayResponse.step === TransactionState.paid ? TransactionState.authorization : etupayResponse.step,
      );

      // If the transaction state wasn't paid, redirect to the error url
      if (!etupayResponse.paid) {
        return response.redirect(env.etupay.errorUrl);
      }

      return response.redirect(env.etupay.successUrl);
    } catch (error) {
      return next(error);
    }
  },*/
];

// Called by the bank few minutes after
export const bankCallback = [
  (request: Request, response: Response) => badRequest(response, Error.ObsoleteRoute),

  // Use the middleware to decrypt the data
  etupay.middleware,

  // Create a small middleware to be able to handle payload errors.
  // The eslint disabling is important because the error argument can only be gotten in the 4 arguments function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: EtupayError, request: Request, response: Response, next: NextFunction) =>
    badRequest(response, Error.InvalidQueryParameters),

  /* async (request: Request, response: Response, next: NextFunction) => {
    if (!/^10\./.test(getIp(request))) {
      // Not sent by a local ip (eg. etupay)
      return forbidden(response, Error.EtupayNoAccess);
    }
    try {
      // Retrieve the base64 payload
      const etupayResponse = response.locals.etupay as EtupayResponse;

      // Decode the base64 string to an object
      const decoded = decodeFromBase64(etupayResponse.serviceData);
      const { cartId } = decoded;

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
      if (
        cart.transactionState !== TransactionState.authorization &&
        cart.transactionState !== TransactionState.pending &&
        etupayResponse.step === TransactionState.paid
      ) {
        return forbidden(response, Error.AlreadyErrored);
      }

      // Update the cart with the callback data
      const updatedCart = await updateCart(cartId, etupayResponse.transactionId, etupayResponse.step);

      if (updatedCart.transactionState === TransactionState.paid)
        // Send the tickets to the user
        await sendPaymentConfirmation(updatedCart);

      return success(response, { api: 'ok' });
    } catch (error) {
      return next(error);
    }
  },*/
];

// Called by the client
export const stripeWebhook = [
  // TODO : add middleware to check the body (maybe see etupay's middleware, see above)

  // Create a small middleware to be able to handle payload errors.
  // The eslint disabling is important because the error argument can only be gotten in the 4 arguments function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: EtupayError, request: Request, response: Response, next: NextFunction) =>
    badRequest(response, Error.InvalidQueryParameters),

  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const body = request.body as stripe.Event;
      if (body.type !== 'checkout.session.completed') {
        return badRequest(response, Error.InvalidBody);
      }
      const session = body.data.object;

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
