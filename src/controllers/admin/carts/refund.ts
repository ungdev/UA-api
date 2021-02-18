import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { noContent, notFound } from '../../../utils/responses';
import { fetchCart, refundCart } from '../../../operations/carts';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const cart = await fetchCart(request.params.cartId);

      // Check if the user exists
      if (!cart) {
        return notFound(response, Error.UserNotFound);
      }

      await refundCart(cart.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
