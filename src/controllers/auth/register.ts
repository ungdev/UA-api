import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { createUser } from '../../operations/user';
import { Error } from '../../types';
import { conflict, created } from '../../utils/responses';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      username: validators.username,
      firstname: validators.firstname,
      lastname: validators.lastname,
      email: validators.email,
      password: validators.password,
      type: validators.type,
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { username, firstname, lastname, email, password, type } = request.body;

    // Tries to create a user
    try {
      await createUser(username, firstname, lastname, email, password, type);
    } catch (error) {
      // If the email already exists in the database, throw a bad request
      if (error.code === 'P2002' && error.meta && error.meta.target === 'email_unique')
        return conflict(response, Error.EmailAlreadyExists);

      // Otherwise, forward the error to the central error handling
      return next(error);
    }

    return created(response);
  },
];
