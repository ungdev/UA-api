import { Request, Response, NextFunction } from 'express';
import { badRequest, notFound, unauthenticated, unauthorized } from '../utils/responses';
import { fetchTeam } from '../operations/team';
import { getRequestUser } from '../utils/user';
import { isValidNanoid } from '../utils/nanoid';
import { Error } from '../types';

// Checks if the user is the captain of the team specified in the URL. If not, it will return an error
export const isCaptain = [
  async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const user = getRequestUser(response);
    if (user) {
      const team = await fetchTeam(request.params.teamId);

      if (!team) {
        return notFound(response, Error.TeamNotFound);
      }

      if (user.id === team.captainId) {
        return next();
      }
      return unauthorized(response);
    }
    return unauthenticated(response);
  },
];

// Checks if the user is who he pretends to be. If not, it will return an error
export const isUserId = (request: Request, response: Response, next: NextFunction): void => {
  const user = getRequestUser(response);
  if (user) {
    if (user.id === request.params.userId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the user is the captain of the team. If not, it will return an error
export const isInTeamId = (request: Request, response: Response, next: NextFunction): void => {
  const user = getRequestUser(response);
  if (user) {
    // Compare user's teamId and teamId of the request
    if (user.teamId === request.params.teamId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};
