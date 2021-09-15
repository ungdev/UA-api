import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { forbidden, notFound, success } from '../../../utils/responses';
import { fetchUser, updateAdminUser } from '../../../operations/user';
import { filterUser } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      type: validators.type.optional(),
      permissions: Joi.array().optional().items(validators.permission.optional()),
      place: validators.place.optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      // Check if the user exists
      if (!user) {
        return notFound(response, Error.UserNotFound);
      }

      const { type, place, permissions } = request.body;

      // Check that the user type hasn't changed if the user is paid
      if (user.hasPaid && user.type !== type) {
        return forbidden(response, Error.CannotChangeType);
      }

      const updatedUser = await updateAdminUser(user.id, type, permissions, place);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
