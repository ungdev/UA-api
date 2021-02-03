import Joi from 'joi';
import bcrpyt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { isSelf } from '../../middlewares/parameters';
import { getRequestUser } from '../../utils/user';
import { filterUser } from '../../utils/filters';
import { success, unauthenticated } from '../../utils/responses';
import { validateBody } from '../../middlewares/validation';
import * as validators from '../../utils/validators';
import { Error } from '../../types';
import { updateUser } from '../../operations/user';

export default [
  // Middlewares
  ...isSelf,

  validateBody(
    Joi.object({
      username: validators.username,
      password: validators.password,
      newPassword: validators.password,
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { username, password, newPassword } = request.body;

    try {
      const user = getRequestUser(response);

      // Compares the hash from the password given
      const isPasswordValid = await bcrpyt.compare(password, user.password);

      // If the password is not valid, rejects the request
      if (!isPasswordValid) {
        return unauthenticated(response, Error.InvalidCredentials);
      }

      const updatedUser = await updateUser(user.id, username, newPassword);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
