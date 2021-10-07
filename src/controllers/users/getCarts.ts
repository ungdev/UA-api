import { NextFunction, Request, Response } from 'express';
import { fetchCarts } from '../../operations/carts';
import { getRequestInfo } from '../../utils/users';
import { filterCartWithCartItems } from '../../utils/filters';
import { success } from '../../utils/responses';
import { isAuthenticated } from '../../middlewares/authentication';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { user } = getRequestInfo(response);
      const carts = await fetchCarts(user.id);
      for (const item of carts.flatMap((cart) => cart.cartItems))
        if (item.itemId === 'ticket-attendant')
          item.forUser.username = `${item.forUser.firstname} ${item.forUser.lastname}`;
      return success(response, carts.map(filterCartWithCartItems));
    } catch (error) {
      return next(error);
    }
  },
];
