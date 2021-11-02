import { Request, Response, NextFunction } from 'express';
import { Error, UserType } from '../types';
import { forbidden } from '../utils/responses';
import { getRequestInfo } from '../utils/users';
import { isAuthenticated } from './authentication';

// Checks if the user is the captain of his team. If not, it will return an error.
export const isCaptain = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user, team } = getRequestInfo(response);

    if (!team) {
      return forbidden(response, Error.NotInTeam);
    }

    if (user.id !== team.captainId) {
      return forbidden(response, Error.NotCaptain);
    }

    return next();
  },
];

// Checks the user's team. If he's in one, it will return an error.
export const isNotInATeam = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    if (user.teamId) {
      return forbidden(response, Error.AlreadyInTeam);
    }

    return next();
  },
];

// Checks the user's team. If he's not in one, it will return an error.
export const isInATeam = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction): void => {
    const { user } = getRequestInfo(response);

    if (!user.teamId) {
      return forbidden(response, Error.NotInTeam);
    }

    return next();
  },
];

// Checks the user is not a team and not a spectator
export const noSpectator = [
  ...isNotInATeam,
  (request: Request, response: Response, next: NextFunction): void => {
    const { user } = getRequestInfo(response);

    if (user.type === UserType.spectator) {
      return forbidden(response, Error.NoSpectator);
    }

    return next();
  },
];

// Checks if the team is locked. If it is, it will return an error.
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
