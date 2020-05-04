import { Request, Response, NextFunction } from 'express';
import { notAcceptable } from '../utils/responses';

export default () => (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS' || req.get('Content-Type') === 'application/json') {
    return next();
  }

  // If etupay callback
  if (req.method === 'GET' && req.path === '/etupay/return') {
    return next();
  }

  return notAcceptable(res);
};
