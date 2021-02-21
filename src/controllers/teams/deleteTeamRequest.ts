import { NextFunction, Request, Response } from 'express';
import { isSelfOrCaptain, isTeamNotLocked } from '../../middlewares/team';
import { cancelTeamRequest } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { forbidden, noContent } from '../../utils/responses';

export default [
  // Middlewares
  ...isSelfOrCaptain,
  isTeamNotLocked,

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
