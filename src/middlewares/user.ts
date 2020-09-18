import { NextFunction, Response } from 'express';
import log from '../utils/log';
import { BodyRequest, Error, User } from '../types';
import { badRequest } from '../utils/responses';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = () => async (req: BodyRequest<User>, res: Response, next: NextFunction) => {
  if (req.body.teamId) {
    log.debug(`${req.path} failed : already in team`);

    return badRequest(res, Error.AlreadyInTeam);
  }

  return next();
};