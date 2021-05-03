import { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { deleteTeamRequest } from '../../operations/team';
import { Error } from '../../types';
import { forbidden, noContent } from '../../utils/responses';
import { getRequestInfo } from '../../utils/user';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { user } = getRequestInfo(response);

      // Check if the user has asked for a team
      if (!user.askingTeamId) return forbidden(response, Error.NotAskedTeam);

      await deleteTeamRequest(user.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
