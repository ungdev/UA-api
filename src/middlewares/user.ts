import { NextFunction, Response, Request } from 'express';
import jwt from 'jsonwebtoken';
import log from '../utils/log';
import { UserRequest, Error, DecodedToken } from '../types';
import { badRequest } from '../utils/responses';
import { getToken } from '../utils/user';
import { jwtSecret } from '../utils/environment';
import { fetchUser } from '../operations/user';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = (request: UserRequest, response: Response, next: NextFunction) => {
  if (request.user.teamId) {
    log.debug(`${request.path} failed : already in team`);

    return badRequest(response, Error.AlreadyInTeam);
  }

  return next();
};

// Initialize UserRequest with user from the database.
export const initUserRequest = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  const token = getToken(request);
  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as DecodedToken;
    const databaseUser = await fetchUser(decoded.userId);
    request.user = databaseUser;
  } else {
    request.user = undefined;
  }
  return next();
};
