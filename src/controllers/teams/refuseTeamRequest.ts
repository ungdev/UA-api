import { NextFunction, Request, Response } from 'express';
import { isCaptain, isTeamNotLocked } from '../../middlewares/team';
import { deleteTeamRequest } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { forbidden, noContent, notFound } from '../../utils/responses';
import { getRequestInfo } from '../../utils/user';

export default [
  // Middlewares
  ...isCaptain,
  isTeamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.params;
      const { team } = getRequestInfo(response);

      const userToReject = await fetchUser(userId);

      // If the user was not found
      if (!userToReject) return notFound(response, Error.UserNotFound);

      // Check if the user to reject is asking for your team
      if (userToReject.askingTeamId !== team.id) return forbidden(response, Error.NotAskedTeam);

      await deleteTeamRequest(userToReject.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
