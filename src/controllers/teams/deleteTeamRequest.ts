import { NextFunction, Request, Response } from 'express';
import { isSelfOrCaptain } from '../../middlewares/parameters';
import { cancelTeamRequest, fetchTeam } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { conflict, success } from '../../utils/responses';

export default [
  // Middlewares
  ...isSelfOrCaptain,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);
      const user = await fetchUser(request.params.userId);

      if (team.lockedAt) return conflict(response, Error.TeamLocked);

      if (!user.askingTeamId) return conflict(response, Error.NotAskedATeam);

      const updatedUser = await cancelTeamRequest(user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
