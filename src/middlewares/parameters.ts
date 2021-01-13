import { Request, Response, NextFunction } from 'express';
import { badRequest, notFound, unauthenticated, forbidden } from '../utils/responses';
import { fetchTeam } from '../operations/team';
import { getRequestUser } from '../utils/user';
import { isValidNanoid } from '../utils/nanoid';
import { Error } from '../types';
import { isAuthenticated } from './authentication';

// Checks if the user is the captain of the team specified in the URL. If not, it will return an error
export const isCaptain = [
  ...isAuthenticated,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const user = getRequestUser(response);
    const team = await fetchTeam(request.params.teamId);

    if (!team) {
      return notFound(response, Error.TeamNotFound);
    }

    if (user.id === team.captainId) {
      return next();
    }
    return forbidden(response);
  },
];

// Checks if the user is who he pretends to be. If not, it will return an error
export const isSelf = [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction): void => {
    const user = getRequestUser(response);
    if (user.id === request.params.userId) {
      return next();
    }
    return forbidden(response);
  },
];

// Checks the user is the captain of the team. If not, it will return an error
export const isInTeam = [
  ...isAuthenticated,
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await fetchTeam(request.params.teamId);

      if (!team) return notFound(response, Error.TeamNotFound);

      const user = getRequestUser(response);
      // Compare user's teamId and teamId of the request
      if (user.teamId === request.params.teamId) {
        return next();
      }
      return forbidden(response);
    } catch (error) {
      return next(error);
    }
  },
];
