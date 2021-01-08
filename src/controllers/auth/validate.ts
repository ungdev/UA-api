import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { isValidToken } from '../../middlewares/parameters';
import validateBody from '../../middlewares/validateBody';
import { createUser, fetchUserByRegisterToken, removeUserRegisterToken } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { badRequest, created, noContent, success } from '../../utils/responses';
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

      return success(response, filterUser(user));
    } catch (error) {
      return next(error);
    }
  },
];
