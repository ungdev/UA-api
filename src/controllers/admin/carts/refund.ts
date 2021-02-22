import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { forbidden, noContent, notFound } from '../../../utils/responses';
import { fetchCart, refundCart } from '../../../operations/carts';
import { TransactionState } from '@prisma/client';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const cart = await fetchCart(request.params.cartId);

      // Check if the user exists
      if (!cart) {
        return notFound(response, Error.CartNotFound);
      }

      // Check if the cart is paid
      if (cart.transactionState !== TransactionState.paid) {
        return forbidden(response, Error.NotPaid);
      }

      await refundCart(cart.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
