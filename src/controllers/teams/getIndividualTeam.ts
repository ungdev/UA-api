import { NextFunction, Request, Response } from 'express';
import { fetchTeam } from '../../operations/team';
import { notFound, success } from '../../utils/responses';
import { Error as ResponseError } from '../../types';
import { filterTeam } from '../../utils/filters';

export default [
  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);

      // Check if the team exists
      if (!team) return notFound(response, ResponseError.TeamNotFound);

      return success(response, filterTeam(team));
    } catch (error) {
      return next(error);
    }
  },
];
