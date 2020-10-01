import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthenticated, unauthorized } from '../utils/responses';
import { getToken } from '../utils/user';
import { jwtSecret } from '../utils/environment';
import { Token, UserRequest } from '../types';
import { fetchTeam } from '../operations/team';
import { fetchUser } from '../operations/user';

// Checks the user is the captain of the team. If not, it will return an error
export const isCaptainOfTeamId = async (
  request: UserRequest,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const token = getToken(request);
  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;
    const { userId } = decoded;

    const { teamId } = request.user;
    const team = await fetchTeam(teamId);
    const { captainId } = team;

    if (userId === captainId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the user is who he pretends to be. If not, it will return an error
export const isUserId = (request: UserRequest, response: Response, next: NextFunction): void => {
  const token = getToken(request);
  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;
    if (decoded.userId === request.user.id) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// Checks the user is the captain of the team. If not, it will return an error
export const isInTeamId = async (request: UserRequest, response: Response, next: NextFunction): Promise<void> => {
  const token = getToken(request);

  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;
    const { userId } = decoded;
    const user = await fetchUser(userId);
    // Compare user's teamId and teamId of the request
    if (user && request.params.teamId === user.teamId) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};
