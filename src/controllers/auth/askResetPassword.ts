import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import validateBody from '../../middlewares/validateBody';
import { fetchUser, generateResetToken } from '../../operations/user';
import { Error } from '../../types';
import { noContent, notFound } from '../../utils/responses';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      email: validators.email,
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email } = request.body;

      const user = await fetchUser(email, 'email');

      if (!user) {
        return notFound(response, Error.UserNotFound);
      }

      await generateResetToken(user.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
