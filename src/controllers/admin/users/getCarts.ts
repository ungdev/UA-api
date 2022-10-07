import { NextFunction, Request, Response } from 'express';
import { fetchCarts } from '../../../operations/carts';
import { filterCartWithCartItemsAdmin } from '../../../utils/filters';
import { notFound, success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { Error, Permission } from '../../../types';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      if (!user) return notFound(response, Error.UserNotFound);

      // Retrieve user carts. The boolean `true` is used to include the
      // Cart#cartItems[x]#item property (and the details of the cartItem)
      const carts = await fetchCarts(user.id, true);

      const adminCarts = carts.map((cart) => ({
        ...cart,
        totalPrice: cart.cartItems.reduce((previous, current) => previous + current.price, 0),
      }));

      // Then we filter the object to reduce output
      return success(response, adminCarts.map(filterCartWithCartItemsAdmin));
    } catch (error) {
      return next(error);
    }
  },
];
