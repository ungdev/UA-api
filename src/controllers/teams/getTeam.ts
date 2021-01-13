import { NextFunction, Request, Response } from 'express';
import { isInTeam } from '../../middlewares/parameters';
import { success } from '../../utils/responses';
import { fetchTeam } from '../../operations/team';
import { filterTeam } from '../../utils/filters';

export default [
  // Middlewares
  ...isInTeam,

  // Controller
  async (request: Request, response: Response) => {
    const team = await fetchTeam(request.params.teamId);

    return success(response, filterTeam(team));
  },
];
