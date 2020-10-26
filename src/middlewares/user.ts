import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import log from '../utils/log';
import { Error, DecodedToken } from '../types';
import { badRequest } from '../utils/responses';
import { getToken, getUser } from '../utils/user';
import { jwtSecret } from '../utils/environment';
import { fetchUser } from '../operations/user';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = (request: Request, response: Response, next: NextFunction) => {
  const user = getUser(response);
  if (user.teamId) {
    log.debug(`${request.path} failed : already in team`);

    return badRequest(response, Error.AlreadyInTeam);
  }

  return next();
};

export const initUserRequest = async (request: Request, response: Response, next: NextFunction) => {
  const token = getToken(request);

  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as DecodedToken;
    const databaseUser = await fetchUser(decoded.userId);
    response.locals.user = databaseUser;
  }
  return next();
};
