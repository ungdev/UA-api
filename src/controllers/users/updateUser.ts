import Joi from 'joi';
import bcrpyt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { getRequestInfo } from '../../utils/users';
import { filterUser } from '../../utils/filters';
import { conflict, success, unauthenticated } from '../../utils/responses';
import { validateBody } from '../../middlewares/validation';
import * as validators from '../../utils/validators';
import { Error } from '../../types';
import { updateUser } from '../../operations/user';
import { isAuthenticated } from '../../middlewares/authentication';

export default [
  // Middlewares
  ...isAuthenticated,

  validateBody(
    Joi.object({
      username: validators.username.optional(),
      password: validators.password.required(),
      newPassword: validators.password.optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { username, password, newPassword } = request.body;

    try {
      const { user } = getRequestInfo(response);

      // Compares the hash from the password given
      const isPasswordValid = await bcrpyt.compare(password, user.password);

      // If the password is not valid, rejects the request
      if (!isPasswordValid) {
        return unauthenticated(response, Error.InvalidCredentials);
      }

      const updatedUser = await updateUser(user.id, { username, newPassword });

      return success(response, filterUser(updatedUser));
    } catch (error) {
      // If the username is already used by someone else, we respond with an error
      if (error.code === 'P2002' && error.meta && error.meta.target === 'username_unique')
        return conflict(response, Error.UsernameAlreadyExists);

      return next(error);
    }
  },
];
