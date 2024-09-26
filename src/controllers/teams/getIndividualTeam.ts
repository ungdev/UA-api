import { NextFunction, Request, Response } from 'express';
import { fetchTeam } from '../../operations/team';
import { notFound, success } from '../../utils/responses';
import { Error as ResponseError } from '../../types';
import { filterTeamRestricted } from '../../utils/filters';
import { isAuthenticated } from '../../middlewares/authentication';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);

      // Check if the team exists
      if (!team) return notFound(response, ResponseError.TeamNotFound);

      return success(response, filterTeamRestricted(team));
    } catch (error) {
      return next(error);
    }
  },
];
