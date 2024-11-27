import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import * as Sentry from '@sentry/node';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { createUser } from '../../operations/user';
import { sendValidationCode } from '../../services/email';
import { Error } from '../../types';
import { conflict, created } from '../../utils/responses';
import * as validators from '../../utils/validators';
import logger from '../../utils/logger';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      username: validators.username.required(),
      firstname: validators.firstname.required(),
      lastname: validators.lastname.required(),
      email: validators.email.required(),
      password: validators.password.required(),
      age: validators.age.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { username, firstname, lastname, email, password, age } = request.body;
    // Tries to create a user
    try {
      const registeredUser = await createUser({
        username,
        firstname,
        lastname,
        email,
        password,
        age,
      });

      // Send registration token by mail
      // Don't send sync when it is not needed
      // If the mail is not sent, the error will be reported through Sentry
      // and staff may resend it manually
      sendValidationCode(registeredUser).catch((error) => {
        Sentry.captureException(error, {
          user: {
            id: registeredUser.id,
            username: registeredUser.username,
            email: registeredUser.email,
          },
        });
        logger.warn(error);
      });
    } catch (error) {
      // If the email already exists in the database, throw a bad request
      if (error.code === 'P2002' && error.meta && error.meta.target === 'users_email_key')
        return conflict(response, Error.EmailAlreadyExists);

      // If the username already exists in the database, throw a bad request
      if (error.code === 'P2002' && error.meta && error.meta.target === 'users_username_key')
        return conflict(response, Error.UsernameAlreadyExists);

      // Otherwise, forward the error to the central error handling
      return next(error);
    }

    return created(response);
  },
];
