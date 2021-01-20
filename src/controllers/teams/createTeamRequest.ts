import { NextFunction, Request, Response } from 'express';
import { isNotInATeam } from '../../middlewares/team';
import { askJoinTeam, fetchTeam } from '../../operations/team';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { conflict, forbidden, notFound, success } from '../../utils/responses';
import { getRequestUser } from '../../utils/user';

export default [
  // Middlewares
  ...isNotInATeam,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);
      const user = getRequestUser(response);

      if (!team) return notFound(response, Error.TeamNotFound);

      if (team.lockedAt) return forbidden(response, Error.TeamLocked);

      if (user.askingTeamId) return forbidden(response, Error.AlreadyAskedATeam);

      const updatedUser = await askJoinTeam(team.id, user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
