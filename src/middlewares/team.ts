import { Request, Response, NextFunction } from 'express';
import { Error } from '../types';
import logger from '../utils/logger';
import { conflict } from '../utils/responses';
import { getRequestUser } from '../utils/user';
import { isAuthenticated } from './authentication';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const user = getRequestUser(response);

    if (user.teamId) {
      logger.debug(`Already in a team`);

      return conflict(response, Error.AlreadyInTeam);
    }

    return next();
  },
];
