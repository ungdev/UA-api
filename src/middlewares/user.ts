import { NextFunction, Response } from 'express';
import log from '../utils/log';
import { UserRequest, Error } from '../types';
import { badRequest } from '../utils/responses';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = (request: UserRequest, response: Response, next: NextFunction) => {
  if (request.user.teamId) {
    log.debug(`${request.path} failed : already in team`);

    return badRequest(response, Error.AlreadyInTeam);
  }

  return next;
};
