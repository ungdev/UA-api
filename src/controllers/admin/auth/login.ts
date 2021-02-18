import { NextFunction, Request, Response } from 'express';
import { UserType } from '@prisma/client';
import { filterUser } from '../../../utils/filters';
import { generateToken } from '../../../utils/user';
import { fetchUser } from '../../../operations/user';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { forbidden, notFound, success } from '../../../utils/responses';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      // Check if the user exists
      if (!user) {
        return notFound(response, Error.UserNotFound);
      }

      if (user.registerToken) {
        return forbidden(response, Error.EmailNotConfirmed);
      }

      if (user.type === UserType.visitor) {
        return forbidden(response, Error.LoginAsVisitor);
      }

      // Generate a token
      const token = generateToken(user);

      return success(response, {
        user: filterUser(user),
        token,
      });
    } catch (error) {
      return next(error);
    }
  },
];
