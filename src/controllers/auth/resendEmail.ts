import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import * as validators from '../../utils/validators';
import { resendEmail } from '../../utils/resendEmail';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      username: validators.username.required(),
      firstname: validators.firstname.required(),
      lastname: validators.lastname.required(),
      email: validators.email.required(),
      password: validators.password.required(),
      age: validators.age.required(),
    }),
  ),

  // Controller
  (request: Request, response: Response, next: NextFunction) => resendEmail(request, response, next),
];