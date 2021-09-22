import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../../middlewares/validation';
import { fetchQueryUser } from '../../operations/user';
import { filterUserRestricted } from '../../utils/filters';
import { notFound, success } from '../../utils/responses';
import { Error } from '../../types';
import { isAuthenticated } from '../../middlewares/authentication';

export default [
  // Middlewares
  validateQuery(
    Joi.object({
      query: Joi.string().required(),
    }),
  ),
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { query } = request.query as { query: string };
      const user = await fetchQueryUser(query);
      if (!user) {
        return notFound(response, Error.UserNotFound);
      }
      return success(response, filterUserRestricted(user));
    } catch (error) {
      return next(error);
    }
  },
];
