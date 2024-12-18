import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import * as Sentry from '@sentry/node';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { fetchUser, generateResetToken } from '../../operations/user';
import { sendMailsFromTemplate } from '../../services/email';
import { noContent } from '../../utils/responses';
import * as validators from '../../utils/validators';
import logger from '../../utils/logger';
import { logSuccessfulUpdates } from '../../middlewares/log';

export default [
  // Middlewares
  ...isNotAuthenticated,
  logSuccessfulUpdates,
  validateBody(
    Joi.object({
      email: validators.email.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email } = request.body;

      const user = await fetchUser(email, 'email');

      // Always return a 204 even if the user doesn't exists to avoid address leakage
      if (user) {
        // Log request (in user logs)
        response.locals.user = user;

        // Use the updated user holding reset token
        const userWithToken = await generateResetToken(user.id);
        // Don't wait for mail to be sent as it could take time
        // We suppose here that is will pass. If it is not the case, error is
        // reported through Sentry and staff may resend the email manually
        sendMailsFromTemplate('passwordreset', [userWithToken]).catch((error) => {
          logger.error(error);
          Sentry.captureException(error, {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
            },
          });
        });
      }

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
