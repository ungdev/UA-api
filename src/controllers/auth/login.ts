import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import bcrpyt from 'bcryptjs';
import { UserType } from '@prisma/client';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { filterUser } from '../../utils/filters';
import { forbidden, success, unauthenticated } from '../../utils/responses';
import { generateToken } from '../../utils/user';
import { Error } from '../../types';
import { fetchUser } from '../../operations/user';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      email: validators.email,
      password: validators.password,
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email, password } = request.body;

      // Fetch the user
      const user = await fetchUser(email, 'email');

      // Checks if the user exists
      if (!user) {
        return unauthenticated(response, Error.InvalidCredentials);
      }

      if (user.registerToken) {
        return forbidden(response, Error.EmailNotConfirmed);
      }

      if (user.type === UserType.visitor) {
        return forbidden(response, Error.LoginAsVisitor);
      }

      // Compares the hash from the password given
      const isPasswordValid = await bcrpyt.compare(password, user.password);

      // If the password is not valid, rejects the request
      if (!isPasswordValid) {
        return unauthenticated(response, Error.InvalidCredentials);
      }

      const token = generateToken(user);

      return success(response, {
        user: filterUser(user),
        token,
      });
    } catch (error) {
      return next(error);
    }
  },
];
