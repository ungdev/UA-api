import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import * as Sentry from '@sentry/node';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { createUser } from '../../operations/user';
import { MailFactory } from '../../services/email';
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
      customMessage: Joi.string().optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { username, firstname, lastname, email, password, customMessage } = request.body;
    // Tries to create a user
    try {
      const registeredUser = await createUser({ username, firstname, lastname, email, password, customMessage });

      // Send registration token by mail
      // Don't send sync when it is not needed
      MailFactory.sendValidationCode(registeredUser).catch((error) => {
        Sentry.captureException(error);
        logger.warn(error);
      });
    } catch (error) {
      // If the email already exists in the database, throw a bad request
      if (error.code === 'P2002' && error.meta && error.meta.target === 'email_unique')
        return conflict(response, Error.EmailAlreadyExists);

      // If the username already exists in the database, throw a bad request
      if (error.code === 'P2002' && error.meta && error.meta.target === 'username_unique')
        return conflict(response, Error.UsernameAlreadyExists);

      // Otherwise, forward the error to the central error handling
      return next(error);
    }

    return created(response);
  },
];
