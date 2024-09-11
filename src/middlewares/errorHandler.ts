import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import * as Sentry from '@sentry/node';
import { Error } from '../types';
import logger from '../utils/logger';
import { badRequest, internalServerError } from '../utils/responses';

// Global error handler
export default [
  // Let Sentry handle the error to send it
  Sentry.expressErrorHandler(),

  // The eslint disabling is important because the error argument can only be gotten in the 4 arguments function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: ErrorRequestHandler, request: Request, response: Response, next: NextFunction) => {
    if (error instanceof SyntaxError) {
      return badRequest(response, Error.MalformedBody);
    }

    logger.error(error);
    return internalServerError(response);
  },
];
