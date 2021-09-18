import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { fetchUser, generateResetToken } from '../../operations/user';
import { Mail } from '../../services/email';
import { noContent } from '../../utils/responses';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      email: validators.email.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email } = request.body;

      const user = await fetchUser(email, 'email');

      // Always return a 204 even if the user doesn't exists to avoid address leakage
      if (user) {
        await generateResetToken(user.id);
        Mail.sendPasswordReset(user);
      }

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
