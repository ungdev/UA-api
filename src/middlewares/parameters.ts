import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { badRequest } from '../utils/responses';
import log from '../utils/log';

export const isCaptainOfTeamId = (request: Request, response: Response, next: NextFunction): void => {
  return next();
};

export const isUserId = (request: Request, response: Response, next: NextFunction): void => {
  log.debug('tyyy');
  return next();
};

export const isInTeamId = (request: Request, response: Response, next: NextFunction): void => {
  return next();
};
