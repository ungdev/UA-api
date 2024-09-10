import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { forbidden, notFound, success } from '../../../utils/responses';
import { forcePay } from '../../../operations/carts';
import { fetchUser, scanUser } from '../../../operations/user';
import { filterUser } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';

export default [
  // Middlewares
  ...hasPermission(Permission.entry),
  validateBody(
    Joi.object({
      consume: Joi.bool().optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { consume } = request.body as { consume: boolean };

      const user = await fetchUser(request.params.userId);

      // Check if the user exists
      if (!user) {
        return notFound(response, Error.UserNotFound);
      }

      // Check if the user is not paid
      if (user.hasPaid) {
        return forbidden(response, Error.PlayerAlreadyPaid);
      }

      await forcePay(user);

      // If payment is done when entering the event, consume the ticket immediately
      if (consume) await scanUser(user.id);

      const updatedUser = await fetchUser(user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
