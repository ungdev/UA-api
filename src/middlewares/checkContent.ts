import { Request, Response, NextFunction } from 'express';
import { notAcceptable } from '../utils/responses';

export default () => (request: Request, response: Response, next: NextFunction): void => {
  if (request.method === 'OPTIONS' || request.get('Content-Type') === 'application/json') {
    return next();
  }

  // If etupay callback
  if (request.method === 'GET' && request.path === '/etupay/return') {
    return next();
  }

  return notAcceptable(response);
};
