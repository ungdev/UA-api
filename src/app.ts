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
if (!env.testing) {
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

app.use((error: Error, request: Request, response: Response, next: NextFunction) =>
  internalServerError(response, error),
);

export default app;
