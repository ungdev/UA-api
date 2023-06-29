import { NextFunction, Request, Response } from 'express';
import { isCaptain, isTeamNotLocked } from '../../middlewares/team';
import { kickUser } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { forbidden, noContent, notFound } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isCaptain,
  isTeamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.params;
      const { team } = getRequestInfo(response);

      const userToKick = await fetchUser(userId);

      if (!userToKick) return notFound(response, Error.UserNotFound);

      // If the user is not in the same team
      if (userToKick.teamId !== team.id) return forbidden(response, Error.NotInTeam);

      // If the user to kick is the captain, refuses the request
      if (userToKick.id === team.captainId) return forbidden(response, Error.CaptainCannotQuit);

      await kickUser(userToKick);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
