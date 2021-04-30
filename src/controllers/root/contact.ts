import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

import { validateBody } from '../../middlewares/validation';
import { noContent } from '../../utils/responses';
import { sendSlackContact } from '../../services/slack';
import * as validators from '../../utils/validators';

export default [
  // Middleware
  validateBody(
    Joi.object({
      firstname: validators.firstname,
      lastname: validators.lastname,
      email: validators.email,
      subject: Joi.string().required(),
      message: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await sendSlackContact(request.body);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
