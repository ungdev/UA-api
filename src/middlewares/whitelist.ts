import { Request, Response, NextFunction } from 'express';
import { getRequestInfo } from '../utils/users';
import { isAuthenticated } from './authentication';
import whitelist from '../../whitelist.json';
import { forbidden } from '../utils/responses';
import { Error } from '../types';

export default [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);
    const { tournamentId } = request.body;
    if (tournamentId in whitelist) {
      return whitelist[<keyof typeof whitelist>tournamentId].includes(user.email)
        ? next()
        : forbidden(response, Error.NotWhitelisted);
    }
    return next();
  },
];
