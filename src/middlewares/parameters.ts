import { Response, NextFunction } from 'express';
import { unauthenticated, unauthorized } from '../utils/responses';
import { UserRequest } from '../types';
import { fetchTeam } from '../operations/team';

// Checks if the user is the captain of the team specified in the URL. If not, it will return an error
export const isCaptainOfTeamId = async (
  request: UserRequest,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const { user } = request;
  if (user) {
    const { teamId } = request.params;
    const team = await fetchTeam(teamId);
    const { captainId } = team;

    if (user.id === captainId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the user is who he pretends to be. If not, it will return an error
export const isUserId = (request: UserRequest, response: Response, next: NextFunction): void => {
  const { user } = request;
  if (user) {
    if (user.id === request.params.userId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the user is the captain of the team. If not, it will return an error
export const isInTeamId = async (request: UserRequest, response: Response, next: NextFunction): Promise<void> => {
  const { user } = request;
  if (user) {
    // Compare user's teamId and teamId of the request
    if (user.teamId === request.params.teamId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};
