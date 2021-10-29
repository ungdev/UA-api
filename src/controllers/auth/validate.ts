import { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { fetchUser, removeUserRegisterToken } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { badRequest, success } from '../../utils/responses';
import { generateToken } from '../../utils/users';

export default [
  // Middlewares
  ...isNotAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { token } = request.params;

      const user = await fetchUser(token, 'registerToken');

      if (!user) {
        return badRequest(response, Error.InvalidParameters);
      }

      // Attach user to (potential) uncaught error
      Sentry.setUser({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      await removeUserRegisterToken(user.id);

      const jwt = generateToken(user);

      return success(response, {
        token: jwt,
        user: filterUser(user),
      });
    } catch (error) {
      return next(error);
    }
  },
];
