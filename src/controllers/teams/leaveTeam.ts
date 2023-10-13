import { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { kickUser } from '../../operations/team';
import { Error } from '../../types';
import { forbidden, noContent } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { user, team } = getRequestInfo(response);

      // If the user to kick is the captain, refuses the request
      if (user.id === team.captainId) return forbidden(response, Error.CaptainCannotQuit);

      await kickUser(user);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
