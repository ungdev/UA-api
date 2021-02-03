import { NextFunction, Request, Response } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { UserType } from '@prisma/client';
import { Error, DecodedToken } from '../types';
import { forbidden, notFound, unauthenticated } from '../utils/responses';
import { fetchUser } from '../operations/user';
import env from '../utils/env';
import logger from '../utils/logger';

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
    const user = await fetchUser(decodedToken.userId);

    if (!user) {
      return notFound(response, Error.UserNotFound);
    }

    // Checks that the account is confirmed
    if (user.registerToken) {
      return forbidden(response, Error.EmailNotConfirmed);
    }

    // It mustn't be a visitor
    if (user.type === UserType.visitor) {
      return forbidden(response, Error.LoginAsVisitor);
    }

    // Store it in `response.locals.user` so that we can use it later
    response.locals.user = user;
  } catch (error) {
    logger.error(error);

    // Token has expired
    if (error instanceof TokenExpiredError) {
      return unauthenticated(response, Error.ExpiredToken);
    }

    return unauthenticated(response, Error.InvalidToken);
  }

  return next();
};
