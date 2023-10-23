import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

import { validateBody } from '../../middlewares/validation';
import { noContent } from '../../utils/responses';
import { sendSlackContact } from '../../services/slack';
import { sendDiscordContact } from '../../utils/discord';
import * as validators from '../../utils/validators';

export default [
  // Middleware
  validateBody(
    Joi.object({
      name: validators.firstname.required(),
      email: validators.email.required(),
      subject: Joi.string().required(),
      message: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await sendSlackContact(request.body);
      await sendDiscordContact(request.body)

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
