import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { forbidden, notFound, success } from '../../../utils/responses';
import { forcePay } from '../../../operations/carts';
import { fetchUser } from '../../../operations/user';
import { filterUser } from '../../../utils/filters';

export default [
  // Middlewares
  ...hasPermission(Permission.entry),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      // Check if the user exists
      if (!user) {
        return notFound(response, Error.UserNotFound);
      }

      // Check if the user is not paid
      if (user.hasPaid) {
        return forbidden(response, Error.AlreadyPaid);
      }

      await forcePay(user);

      const updatedUser = await fetchUser(user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
