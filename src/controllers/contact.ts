import { Request, Response } from 'express';

import validateBody from '../middlewares/validateBody';
import { noContent, internalServerError } from '../utils/responses';
import { sendSlackContact } from '../services/slack';
import { contactValidator } from '../validator';

export default [
  // Middleware
  validateBody(contactValidator),

  // Controller
  async (request: Request, response: Response) => {
    const slackResponse = await sendSlackContact(request.body);
    if (slackResponse.status !== 200 || slackResponse.data.ok === false) {
      return internalServerError(response);
    }
    return noContent(response);
  },
];
