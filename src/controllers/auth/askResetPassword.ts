import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import * as Sentry from '@sentry/node';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { fetchUser, generateResetToken } from '../../operations/user';
import { sendPasswordReset } from '../../services/email';
import { noContent } from '../../utils/responses';
import * as validators from '../../utils/validators';
import logger from '../../utils/logger';

export default [
  // Middlewares
  ...isNotAuthenticated,
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
        // Use the updated user holding reset token
        const userWithToken = await generateResetToken(user.id);
        // Don't wait for mail to be sent as it could take time
        // We suppose here that is will pass. If it is not the case, error is
        // reported through Sentry and staff may resend the email manually
        sendPasswordReset(userWithToken).catch((error) => {
          logger.error(error);
          Sentry.captureException(error);
        });
      }

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
