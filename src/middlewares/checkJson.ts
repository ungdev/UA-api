import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { badRequest } from '../utils/responses';

export const checkJson = () => (error: ErrorRequestHandler, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof SyntaxError) {
    return badRequest(res);
  }

  return next();
};
