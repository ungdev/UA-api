import { IRoute, NextFunction, Request, Response } from 'express';
import log from '../utils/log';
import { BodyRequest, User } from '../types';

// Check the user's team. If he's in one, it will return an error.
export const isNotInATeam = () => async (req: BodyRequest<User>, res: Response, next: NextFunction) => {
  if (req.body.teamId) {
    log.debug(`${req.path} failed : already in team`);

    return res
      .status(401)
      .json({ error: 'ALREADY_IN_TEAM' })
      .end();
  }

  return next();
};