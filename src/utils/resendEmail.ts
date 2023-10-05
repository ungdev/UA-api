import { NextFunction, Request, Response } from 'express';
import bcrpyt from 'bcryptjs';
import * as Sentry from '@sentry/node';
import { forbidden, success, unauthenticated } from './responses';
import { fetchUser } from '../operations/user';
import { Error as ResponseError } from '../types';
import * as validators from './validators';
import { sendValidationCode } from '../services/email';
import logger from './logger';

export async function resendEmail(request: Request, response: Response, next: NextFunction) {
  try {
    const { username, password } = request.body;

    // Fetch the user depending on the email or the username
    if (validators.username.validate(username).error) {
      return unauthenticated(response, ResponseError.InvalidCredentials);
    }

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
}
