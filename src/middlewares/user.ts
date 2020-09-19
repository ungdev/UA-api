import { NextFunction, Response } from 'express';
import log from '../utils/log';
import { UserRequest, Error } from '../types';
import { badRequest } from '../utils/responses';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = async (req: UserRequest, res: Response, next: NextFunction) => {
  if (req.user.teamId) {
    log.debug(`${req.path} failed : already in team`);

    return badRequest(res, Error.AlreadyInTeam);
  }

  return next;
};
