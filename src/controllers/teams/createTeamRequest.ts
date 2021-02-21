import { NextFunction, Request, Response } from 'express';
import { isNotInATeam } from '../../middlewares/team';
import { askJoinTeam, fetchTeam } from '../../operations/team';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { forbidden, notFound, success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/user';

export default [
  // Middlewares
  ...isNotInATeam,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);

      // Check if the team exists
      if (!team) return notFound(response, Error.TeamNotFound);

      // Check if the team is not locked
      if (team.lockedAt) return forbidden(response, Error.TeamLocked);

      const { user } = getRequestInfo(response);

      // Check if the user is already asking for a team
      if (user.askingTeamId) return forbidden(response, Error.AlreadyAskedATeam);

      const updatedUser = await askJoinTeam(team.id, user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
