import express, { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { notFound, internalServerError, badRequest } from './utils/responses';
import { Error } from './types';
import router from './controllers';
import json from './middlewares/json';
import logger, { morgan } from './utils/logger';
import { initUserRequest } from './middlewares/user';
import env from './utils/env';

const app = express();

app.use(morgan());

// Security middlewares
app.use(cors(), helmet());

// Use json middleware to check and parse json body
app.use(json);

// Fetch user from database
app.use(initUserRequest);
// Main routes
app.use(env.api.prefix, router);

// Not found
app.use((request: Request, response: Response) => notFound(response, Error.RouteNotFound));

// In case of unhandled error
// A try catch must be set on every route with a next(error) in the catch block
// The eslint disabling is important because the error argument can only be gotten in the 4 arguments function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: ErrorRequestHandler, request: Request, response: Response, next: NextFunction) => {
  if (error instanceof SyntaxError) {
    return badRequest(response, Error.MalformedBody);
  }

  logger.error(error);
  return internalServerError(response);
});

export default app;
