import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../../middlewares/validation';
import { fetchUserByUsername } from '../../operations/user';
import { filterUserRestricted } from '../../utils/filters';
import { success } from '../../utils/responses';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  validateQuery(
    Joi.object({
      userId: validators.username.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.query as { userId: string };
      const user = await fetchUserByUsername(userId);
      const result = filterUserRestricted(user);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
