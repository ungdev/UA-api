import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { badRequest } from '../utils/responses';

export const checkJson = () => (
  error: ErrorRequestHandler,
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (error instanceof SyntaxError) {
    return badRequest(response);
  }

  return next();
};
