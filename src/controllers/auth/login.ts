import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import bcrpyt from 'bcryptjs';
import { isNotAuthenticated } from '../../middlewares/authentication';
import validateBody from '../../middlewares/validateBody';
import { filterUser } from '../../utils/filters';
import { badRequest, success } from '../../utils/responses';
import { generateToken } from '../../utils/user';
import { Error } from '../../types';
import { fetchUser } from '../../operations/user';
import { isLoginAllowed } from '../../middlewares/settings';

export default [
  // Middlewares
  isNotAuthenticated(),
  isLoginAllowed(),
  validateBody(
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email, password } = request.body;

      // Fetch the user
      const user = await fetchUser(email, 'email');

      // Chceks if the user exists
      if (!user) {
        return badRequest(response, Error.InvalidCredentials);
      }

      if (user.registerToken) {
        return badRequest(response, Error.EmailNotConfirmed);
      }

      // Compares the hash from the password given
      const isPasswordValid = await bcrpyt.compare(password, user.password);

      const token = generateToken(user);

      // If the password is not valid, rejects the request
      if (!isPasswordValid) {
        return badRequest(response, Error.InvalidCredentials);
      }

      return success(response, {
        user: filterUser(user),
        token,
      });
    } catch (error) {
      return next(error);
    }
  },
];
