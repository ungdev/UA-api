import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import * as Sentry from '@sentry/node';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { changePassword, fetchUser, removeUserResetToken } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { badRequest, success } from '../../utils/responses';
import { generateToken } from '../../utils/users';
import * as validators from '../../utils/validators';
import { logSuccessfulUpdates } from '../../middlewares/log';

export default [
  // Middlewares
  ...isNotAuthenticated,
  logSuccessfulUpdates,
  validateBody(
    Joi.object({
      password: validators.password.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { token } = request.params;
      const { password } = request.body;

      const user = await fetchUser(token, 'resetToken');

      if (!user) {
        return badRequest(response, Error.InvalidParameters);
      }

      // Attach user to logs if an error occurs
      Sentry.setUser({
        id: user.id,
        username: user.username,
        email: user.email,
      });
      // Attach user to db logs (if password is successfully updated)
      response.locals.user = user;

      await removeUserResetToken(user.id);
      await changePassword(user, password);

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
