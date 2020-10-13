import { Response, NextFunction } from 'express';
import { unauthenticated, unauthorized } from '../utils/responses';
import { UserRequest } from '../types';
import { fetchTeam } from '../operations/team';

// Checks the user is the captain of the team. If not, it will return an error
export const isCaptainOfTeamId = async (
  request: UserRequest,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const { user } = request;
  if (user) {
    const { teamId } = request.user;
    const team = await fetchTeam(teamId);
    const { captainId } = team;

    if (user.id === captainId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the User is null to initialize it with initUserRequest(). If not, it will return an error
export const isUserNull = (request: UserRequest, response: Response, next: NextFunction): void => {
  if (request.user === null) {
    return next();
  }
  return unauthorized(response);
};

// Checks the user is the captain of the team. If not, it will return an error
export const isInTeamId = async (request: UserRequest, response: Response, next: NextFunction): Promise<void> => {
  const { user } = request;
  if (user) {
    // Compare user's teamId and teamId of the request
    if (request.params.teamId === user.teamId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};
