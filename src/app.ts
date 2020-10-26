import express, { Request, Response, ErrorRequestHandler, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import * as Sentry from '@sentry/node';

import { notFound } from './utils/responses';
import { Error } from './types';
import routes from './controllers';
import { checkJson } from './middlewares/checkJson';
import { morgan } from './utils/log';
import { apiPrefix, isTest } from './utils/environment';
import { initSentryExpress } from './utils/sentry';
import { initUserRequest } from './middlewares/user';

const app = express();

// Loads logging middleware with more verbosity if in dev environment, and enable datadog production environment, and error reporting
if (!isTest()) {
  app.use(morgan());
  initSentryExpress(app);
}

// Security middlewares
app.use(cors(), helmet());

// Body json middlewares
app.use(bodyParser.json(), checkJson());

// Fetch user from database
app.use(initUserRequest);

// Main routes
app.use(apiPrefix(), routes());

// Not found
app.use((request: Request, response: Response) => notFound(response, Error.RouteNotFound));

app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: ErrorRequestHandler, request: Request, response: Response, next: NextFunction) => {
  // The error id is attached to `response.sentry` to be returned
  // and optionally displayed to the user for support.
  response.statusCode = 500;
  // @ts-ignore
  response.end(`${response.sentry}\n`);
});

export default app;
