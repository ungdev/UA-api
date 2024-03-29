import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { loginAccount } from '../../../utils/login';
import { isNotAuthenticated } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { Error as ResponseError } from '../../../types';
import * as validators from '../../../utils/validators';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      login: Joi.string().required().error(new Error(ResponseError.EmptyLogin)),
      password: validators.password.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    await loginAccount(request, response, next, true);
  },
];
