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

      return success(response, carts.map(filterCartWithCartItems));
    } catch (error) {
      return next(error);
    }
  },
];
