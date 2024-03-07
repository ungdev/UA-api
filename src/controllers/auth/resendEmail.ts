import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import bcrpyt from 'bcryptjs';
import * as Sentry from '@sentry/node';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import * as validators from '../../utils/validators';
import { forbidden, success, unauthenticated } from '../../utils/responses';
import { Error as ResponseError } from '../../types';
import { fetchUser } from '../../operations/user';
import { sendValidationCode } from '../../services/email';
import logger from '../../utils/logger';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      username: validators.username.required(),
      email: validators.email.required(),
      password: validators.password.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { username, password } = request.body;

      const field = 'username';

      const user = await fetchUser(username, field);

      // Checks if the user exists
      if (!user) {
        return unauthenticated(response, ResponseError.InvalidCredentials);
      }

      // Checks if the user doesn't already have its email confirmed
      if (!user.registerToken) {
        return forbidden(response, ResponseError.EmailAlreadyConfirmed);
      }

      // Compares the hash from the password given
      const isPasswordValid = await bcrpyt.compare(password, user.password);

      // If the password is not valid, rejects the request
      if (!isPasswordValid) {
        return unauthenticated(response, ResponseError.InvalidCredentials);
      }

      // Send registration token by mail
      // Don't send sync when it is not needed
      // If the mail is not sent, the error will be reported through Sentry
      // and staff may resend it manually
      sendValidationCode(user).catch((error) => {
        Sentry.captureException(error, {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
        logger.warn(error);
      });
      return success(response, {
        sent: true,
      });
    } catch (error) {
      return next(error);
    }
  },
];
