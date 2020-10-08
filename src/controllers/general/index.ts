import { Request, Response } from 'express';
import validateBody from '../../middlewares/validateBody';
import { ObjectType, Setting } from '../../types';
import database from '../../utils/database';

import { noContent, success, badRequest } from '../../utils/responses';
import { sendContactMessage } from '../../utils/slack';
import { contactValidator } from '../../validator';

export const status = async (request: Request, response: Response) => {
  const settings = await database.settings.findMany();
  return success(
    response,
    // Transform [{ id: "x", value: "true"}] to { x: true }
    settings.reduce((previous: ObjectType, current: Setting) => {
      Object.assign(previous, { [current.id]: current.value === 'true' });
      return previous;
    }, {}),
  );
};

export const contact = [
  // Middleware
  validateBody(contactValidator),
  // Controller
  async (request: Request, response: Response) => {
    const slackResponse = await sendContactMessage(request.body);
    if (slackResponse.status !== 200) {
      return badRequest(response);
    }
    return noContent(response);
  },
];
