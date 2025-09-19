import { Request, Response, NextFunction } from 'express';
import { getRequestInfo } from '../utils/users';
import { isAuthenticated } from './authentication';
import whitelist from '../../whitelist.json';
import { forbidden } from '../utils/responses';
import { Error } from '../types';
import logger from '../utils/logger';

export default [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);
    const { tournamentId } = request.body;

    if (tournamentId in whitelist) {
      if (whitelist[<keyof typeof whitelist>tournamentId].includes(user.email.toLowerCase())) return next();
      logger.info(whitelist);
      return forbidden(response, Error.NotWhitelisted);
    }
    return next();
  },
];
