import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { isLoginAllowed } from '../../middlewares/settings';
import validateBody from '../../middlewares/validateBody';
import { createUser } from '../../operations/user';
import { Error } from '../../types';
import { badRequest, created } from '../../utils/responses';

export default [
  // Middlewares
  isNotAuthenticated(),
  isLoginAllowed(),
  validateBody(
    Joi.object({
      username: Joi.string().required(),
      firstname: Joi.string().required(),
      lastname: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      type: Joi.string().valid(UserType.player, UserType.coach, UserType.visitor),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { username, firstname, lastname, email, password } = request.body;

    // Tries to create a user
    try {
      await createUser(username, firstname, lastname, email, password);
    } catch (error) {
      // If the email already exists in the database, throw a bad request
      if (error.code === 'P2002' && error.meta && error.meta.target === 'email_unique')
        return badRequest(response, Error.EmailAlreadyExists);

      // Otherwise, forward the error to the central error handling
      return next(error);
    }

    return created(response);
  },
];
