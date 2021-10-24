import { NextFunction, Request, Response } from 'express';
import { fetchCarts } from '../../../operations/carts';
import { filterCartWithCartItemsAdmin } from '../../../utils/filters';
import { notFound, success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { Error, Permission, ItemCategory } from '../../../types';
import { isPartnerSchool } from '../../../utils/helpers';

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
        // Compute the price of each cart. In order to do so, we check whether
        // the bought item is a `ItemCategory.ticket` and whether the recipient
        // is eligible for a discount
        totalPrice: cart.cartItems
          .map(
            (cartItem) =>
              (cartItem.item.category === ItemCategory.ticket &&
              cartItem.item.reducedPrice &&
              isPartnerSchool(cartItem.forUser.email)
                ? cartItem.item.reducedPrice
                : cartItem.item.price) * cartItem.quantity,
          )
          .reduce((price1, price2) => price1 + price2, 0),
      }));

      // Then we filter the object to reduce output
      return success(response, adminCarts.map(filterCartWithCartItemsAdmin));
    } catch (error) {
      return next(error);
    }
  },
];
