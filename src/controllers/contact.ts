import { Request, Response } from 'express';

import validateBody from '../middlewares/validateBody';
import { noContent, unknown } from '../utils/responses';
import { sendSlackContact } from '../utils/slack';
import { contactValidator } from '../validator';

export default [
  // Middleware
  validateBody(contactValidator),

  // Controller
  async (request: Request, response: Response) => {
    const slackResponse = await sendSlackContact(request.body);
    if (slackResponse.status !== 200 || slackResponse.data.ok === false) {
      return unknown(response);
    }
    return noContent(response);
  },
];
