import { Request, Response } from 'express';
import Joi from 'joi';

import validateBody from '../middlewares/validateBody';
import { noContent, internalServerError } from '../utils/responses';
import { sendSlackContact } from '../services/slack';
import * as validators from '../utils/validators';

export default [
  // Middleware
  validateBody(
    Joi.object({
      name: validators.firstname,
      email: validators.email,
      subject: Joi.string().required(),
      message: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response) => {
    const slackResponse = await sendSlackContact(request.body);
    if (slackResponse.status !== 200 || slackResponse.data.ok === false) {
      return internalServerError(response);
    }
    return noContent(response);
  },
];
