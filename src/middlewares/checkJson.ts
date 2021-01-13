import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { Error } from '../types';
import { badRequest } from '../utils/responses';

export const checkJson = (
  error: ErrorRequestHandler,
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (error instanceof SyntaxError) {
    return badRequest(response, Error.MalformedBody);
  }

  return next();
};
