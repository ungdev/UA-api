import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';

import { notFound } from './utils/responses';
import { Error } from './types';
import router from './controllers';
import { checkJson } from './middlewares/checkJson';
import logger, { morgan } from './utils/logger';
import { initUserRequest } from './middlewares/user';
import env from './utils/env';
import { internalServerError } from './utils/responses';

const app = express();

// Loads logging middleware with more verbosity if in dev environment
if (!env.test) {
  app.use(morgan());
}

// Security middlewares
app.use(cors(), helmet());

// Body json middlewares
app.use(bodyParser.json(), checkJson());

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
app.use((error: Error, request: Request, response: Response, next: NextFunction) => {
  logger.error(error);
  return internalServerError(response);
});

export default app;
