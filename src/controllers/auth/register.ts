import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import validateBody from '../../middlewares/validateBody';
import { createUser } from '../../operations/user';
import { Error } from '../../types';
import { badRequest, created, noContent, success } from '../../utils/responses';
import { userValidator } from '../../validator';

export default [
  // Middlewares
  isNotAuthenticated(),
  validateBody(
    Joi.object({
      username: Joi.string().required(),
      firstname: Joi.string().required(),
      lastname: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      discordId: Joi.string().required(),
      type: Joi.string().valid(UserType.player, UserType.coach, UserType.visitor),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { username, firstname, lastname, email, password, discordId } = request.body;

      // Tries to create a user
      try {
        await createUser(username, firstname, lastname, email, password, discordId);
      } catch (error) {
        // If the email already exists in the database, throw a bad request
        if (error.code === 'P2002' && error.meta && error.meta.target === 'email')
          return badRequest(response, Error.EmailAlreadyExists);

        // Otherwise, forward the error to the central error handling
        return next(error);
      }

      return created(response);
    } catch (error) {
      return next(error);
    }
  },
];
