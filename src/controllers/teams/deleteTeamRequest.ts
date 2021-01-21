import { NextFunction, Request, Response } from 'express';
import { isSelfOrCaptain, teamNotLocked } from '../../middlewares/parameters';
import { cancelTeamRequest } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { conflict, forbidden, noContent, success } from '../../utils/responses';

export default [
  // Middlewares
  ...isSelfOrCaptain,
  teamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      if (!user.askingTeamId) return forbidden(response, Error.NotAskedATeam);

      await cancelTeamRequest(user.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
