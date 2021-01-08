import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { isValidToken } from '../../middlewares/parameters';
import validateBody from '../../middlewares/validateBody';
import { createUser, fetchUserByEmail, fetchUserByRegisterToken, removeUserRegisterToken } from '../../operations/user';
import { filterUser } from '../../utils/filters';
import { badRequest, created, noContent, success } from '../../utils/responses';
import bcrpyt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../../utils/env';

export default [
  // Middlewares
  isNotAuthenticated(),
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
      const user = await fetchUserByEmail(email);

      // Chceks if the user exists
      if (!user) {
        return badRequest(response);
      }

      // Compares the hash from the password given
      const isPasswordValid = await bcrpyt.compare(password, user.password);

      // If the password is not valid, rejects the request
      if (!isPasswordValid) {
        return badRequest(response);
      }

      const token = jwt.sign({ id: user.id }, env.jwt.secret, {
        expiresIn: env.jwt.expires,
      });

      return success(response, {
        user: filterUser(user),
        token,
      });
    } catch (error) {
      return next(error);
    }
  },
];
