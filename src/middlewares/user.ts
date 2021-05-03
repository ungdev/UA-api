import { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { UserType } from '@prisma/client';
import { Error, DecodedToken } from '../types';
import { forbidden, notFound, unauthenticated } from '../utils/responses';
import { fetchUser } from '../operations/user';
import env from '../utils/env';
import logger from '../utils/logger';
import { fetchTeam } from '../operations/team';

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

    // Set the sentry user to identify the problem in case of 500
    Sentry.setUser({ id: user.id, username: user.username, email: user.email });

    // Store it in `response.locals.user` so that we can use it later
    response.locals.user = user;

    // If the user has a team, fetch it and put it in the locals
    if (user.teamId) {
      const team = await fetchTeam(user.teamId);
      response.locals.team = team;
    }
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
