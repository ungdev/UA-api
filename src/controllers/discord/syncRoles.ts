import { NextFunction, Request, Response } from 'express';
import { isCaptain, isTeamNotLocked } from '../../middlewares/team';
import { noContent, unauthenticated } from '../../utils/responses';
import { Error } from '../../types';
import { syncRoles } from '../../utils/discord';
import env from '../../utils/env';

export default [
  // Middlewares
  ...isCaptain,
  isTeamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { token } = request.body;

      // Checks if a token was given
      if (!token) {
        return unauthenticated(response, Error.NoToken);
      }

      // Checks if the token is valid
      if (token !== env.discord.syncKey) {
        return unauthenticated(response, Error.InvalidToken);
      }

      await syncRoles();
      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
