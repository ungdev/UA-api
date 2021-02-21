import { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { cancelTeamRequest } from '../../operations/team';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { forbidden, noContent, notFound } from '../../utils/responses';
import { getRequestInfo } from '../../utils/user';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.params;
      const loggedUser = getRequestInfo(response).user;
      const { team } = getRequestInfo(response);

      // Define the user to reject
      let userToReject;

      // If the user to reject is the user logged
      if (loggedUser.id === userId) {
        userToReject = loggedUser;

        if (!loggedUser.askingTeamId) return forbidden(response, Error.NotAskedTeam);
      } else {
        userToReject = await fetchUser(userId);

        // If the user was not found
        if (!userToReject) return notFound(response, Error.UserNotFound);

        // Check if the user is in a team
        if (!team) return forbidden(response, Error.NotInTeam);

        // Check if it the captain
        if (loggedUser.id !== team.captainId) return forbidden(response, Error.NotCaptain);

        // Check if the user to reject is asking for your team
        if (userToReject.askingTeamId !== team.id) return forbidden(response, Error.NotAskedTeam);
      }

      await cancelTeamRequest(userToReject.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
