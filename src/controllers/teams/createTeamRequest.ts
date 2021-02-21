import { NextFunction, Request, Response } from 'express';
import { isNotInATeam, isTeamNotLocked } from '../../middlewares/team';
import { askJoinTeam, fetchTeam } from '../../operations/team';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { forbidden, success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/user';

export default [
  // Middlewares
  ...isNotInATeam,
  isTeamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);
      const { user } = getRequestInfo(response);

      if (user.askingTeamId) return forbidden(response, Error.AlreadyAskedATeam);

      const updatedUser = await askJoinTeam(team.id, user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
