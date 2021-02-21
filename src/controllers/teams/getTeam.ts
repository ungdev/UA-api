import { NextFunction, Request, Response } from 'express';
import { isInATeam } from '../../middlewares/team';
import { success } from '../../utils/responses';
import { fetchTeam } from '../../operations/team';
import { filterTeam } from '../../utils/filters';

export default [
  // Middlewares
  ...isInATeam,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);

      return success(response, filterTeam(team));
    } catch (error) {
      return next(error);
    }
  },
];
