import { NextFunction, Request, Response } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import logger from '../utils/logger';
import { Error, DecodedToken } from '../types';
import { badRequest } from '../utils/responses';
import { getRequestUser } from '../utils/user';
import { fetchUser } from '../operations/user';
import env from '../utils/env';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = (request: Request, response: Response, next: NextFunction) => {
  const user = getRequestUser(response);

  if (user.teamId) {
    logger.debug(`${request.path} failed : already in team`);

    return badRequest(response, Error.AlreadyInTeam);
  }

  return next();
};

// Fetch user from database if possible
export const initUserRequest = async (request: Request, response: Response, next: NextFunction) => {
  // Get authorization header
  const authorizationHeader = request.get('Authorization');
  if (!authorizationHeader) {
    return next();
  }

  // Get the JsonWebToken from the authorization header
  // Authorization header is of the form "Bearer {token}"
  const token = authorizationHeader.split(' ')[1];

  try {
    // Decode the jwt
    const decodedToken = jwt.verify(token, env.jwt.secret) as DecodedToken;

    // Fetch the user from the database
    const databaseUser = await fetchUser(decodedToken.userId);

    // Store it in `response.locals.user` so that we can use it later
    response.locals.user = databaseUser;
  } catch (error) {
    // Token has expired
    if (error instanceof TokenExpiredError) {
      return badRequest(response, Error.ExpiredToken);
    }

    return badRequest(response, Error.InvalidToken);
  }

  return next();
};
