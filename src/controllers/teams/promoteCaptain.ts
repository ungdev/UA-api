import { NextFunction, Request, Response } from 'express';
import { isCaptain } from '../../middlewares/team';
import { formatPrimitiveTeam, promoteUser } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { filterTeam } from '../../utils/filters';
import { forbidden, notFound, success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isCaptain,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { team } = getRequestInfo(response);

      const { userId } = request.params;

      const userToPromote = await fetchUser(userId);

      // Check if the user exists
      if (!userToPromote) return notFound(response, Error.UserNotFound);

      // Check that the user is in the team id
      if (userToPromote.teamId !== team.id) return forbidden(response, Error.NotInTeam);

      // Check if the user is not already a captain
      if (userToPromote.id === team.captainId) return forbidden(response, Error.AlreadyCaptain);

      const updatedTeam = await promoteUser(team.id, userId);

      return success(response, filterTeam(await formatPrimitiveTeam(updatedTeam)));
    } catch (error) {
      return next(error);
    }
  },
];
