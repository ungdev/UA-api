import { Request, Response, NextFunction } from 'express';
import { Error } from '../types';
import logger from '../utils/logger';
import { forbidden } from '../utils/responses';
import { getRequestInfo } from '../utils/user';
import { isAuthenticated } from './authentication';

// Checks if the user is the captain of the team specified in the URL. If not, it will return an error
export const isCaptain = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user, team } = getRequestInfo(response);

    if (!team) {
      return forbidden(response, Error.NotInTeam);
    }

    if (user.id === team.captainId) {
      return next();
    }
    return forbidden(response, Error.NotCaptain);
  },
];

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    if (user.teamId) {
      logger.debug(`Already in a team`);

      return forbidden(response, Error.AlreadyInTeam);
    }

    return next();
  },
];

// Checks the team is locked
export const isTeamNotLocked = (request: Request, response: Response, next: NextFunction) => {
  const { team } = getRequestInfo(response);

  if (!team) {
    return forbidden(response, Error.NotInTeam);
  }

  if (team.lockedAt) {
    return forbidden(response, Error.TeamLocked);
  }
  return next();
};

export const isInATeam = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction): void => {
    const { user } = getRequestInfo(response);
    // Compare user's teamId and teamId of the request
    if (user.teamId) {
      return next();
    }
    return forbidden(response, Error.NotInTeam);
  },
];
