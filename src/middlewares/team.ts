import { Request, Response, NextFunction } from 'express';
import { Error } from '../types';
import logger from '../utils/logger';
import { badRequest } from '../utils/responses';
import { getRequestUser } from '../utils/user';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = () => (request: Request, response: Response, next: NextFunction) => {
  const user = getRequestUser(response);

  if (user.teamId) {
    logger.debug(`Already in a team`);

    return badRequest(response, Error.AlreadyInTeam);
  }

  return next();
};
