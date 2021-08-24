import { NextFunction, Request, Response } from 'express';
import { fetchCarts } from '../../../operations/carts';
import { filterCartWithCartItems } from '../../../utils/filters';
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

      const carts = await fetchCarts(user.id);

      return success(response, carts.map(filterCartWithCartItems));
    } catch (error) {
      return next(error);
    }
  },
];
