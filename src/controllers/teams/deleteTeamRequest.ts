import { NextFunction, Request, Response } from 'express';
import { isSelfOrCaptain } from '../../middlewares/parameters';
import { cancelTeamRequest } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { conflict, forbidden, success } from '../../utils/responses';

export default [
  // Middlewares
  ...isSelfOrCaptain,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      if (!user.askingTeamId) return forbidden(response, Error.NotAskedATeam);

      const updatedUser = await cancelTeamRequest(user.id);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
