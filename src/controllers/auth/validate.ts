import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { isValidToken } from '../../middlewares/parameters';
import validateBody from '../../middlewares/validateBody';
import { createUser, fetchUserByRegisterToken, removeUserRegisterToken } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { badRequest, created, noContent, notFound, success } from '../../utils/responses';
import { generateToken } from '../../utils/user';
import { userValidator } from '../../validator';

export default [
  // Middlewares
  isNotAuthenticated(),
  isValidToken(),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { token } = request.params;

      const user = await fetchUserByRegisterToken(token);

      if (!user) {
        return badRequest(response);
      }

      await removeUserRegisterToken(user);

      const jwt = generateToken(user);

      return success(response, {
        jwt,
        user: filterUser(user),
      });
    } catch (error) {
      return next(error);
    }
  },
];
