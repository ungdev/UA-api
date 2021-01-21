import { NextFunction, Request, Response } from 'express';
import { teamNotLocked } from '../../middlewares/parameters';
import { isNotInATeam } from '../../middlewares/team';
import { askJoinTeam, fetchTeam } from '../../operations/team';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { forbidden, success } from '../../utils/responses';
import { getRequestUser } from '../../utils/user';

export default [
  // Middlewares
  ...isNotInATeam,
  teamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);
      const user = getRequestUser(response);

      if (user.askingTeamId) return forbidden(response, Error.AlreadyAskedATeam);

      const updatedUser = await askJoinTeam(team.id, user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
