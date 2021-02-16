import { NextFunction, Request, Response } from 'express';
import { isCaptain, teamNotLocked } from '../../middlewares/parameters';
import { fetchTeam, promoteUser } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { filterTeam } from '../../utils/filters';
import { forbidden, success } from '../../utils/responses';

export default [
  // Middlewares
  ...isCaptain,
  teamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId, teamId } = request.params;

      const userToPromote = await fetchUser(userId);

      // Check that the user is in the team id
      if (userToPromote.teamId !== teamId) return forbidden(response, Error.NotInTeam);

      await promoteUser(teamId, userId);

      const team = await fetchTeam(teamId);

      return success(response, filterTeam(team));
    } catch (error) {
      return next(error);
    }
  },
];
