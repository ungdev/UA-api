import { NextFunction, Request, Response } from 'express';
import { isSelfOrCaptain, teamNotLocked } from '../../middlewares/parameters';
import { fetchTeam, kickUser } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { forbidden, noContent } from '../../utils/responses';

export default [
  // Middlewares
  ...isSelfOrCaptain,
  teamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId, teamId } = request.params;

      const userToKick = await fetchUser(userId);

      // Check that the user is in the team id
      if (userToKick.teamId !== teamId) return forbidden(response, Error.NotInTeam);

      const team = await fetchTeam(userToKick.teamId);

      // If the user to kick is the captain, refuses the request
      if (userToKick.id === team.captainId) return forbidden(response, Error.CaptainCannotQuit);

      await kickUser(userToKick.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
