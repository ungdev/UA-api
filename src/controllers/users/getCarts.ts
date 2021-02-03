import { NextFunction, Request, Response } from 'express';
import { isSelf } from '../../middlewares/parameters';
import { fetchCarts } from '../../operations/carts';
import { getRequestUser } from '../../utils/user';
import { filterCartWithCartItems } from '../../utils/filters';
import { success } from '../../utils/responses';

export default [
  // Middlewares
  ...isSelf,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = getRequestUser(response);
      const carts = await fetchCarts(user.id);

      return success(response, carts.map(filterCartWithCartItems));
    } catch (error) {
      return next(error);
    }
  },
];
