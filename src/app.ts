import express, { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';

import { notFound } from './utils/responses';
import { Error } from './types';
import router from './controllers';
import json from './middlewares/json';
import { morgan } from './utils/logger';
import { initUserRequest } from './middlewares/user';
import env from './utils/env';
import errorHandler from './middlewares/errorHandler';
import { enforceQueryString, validateParameter } from './middlewares/validation';
import * as validators from './utils/validators';

const app = express();

// Initiate Sentry
Sentry.init({ dsn: env.log.sentryDsn, environment: env.environment });
app.use(Sentry.Handlers.requestHandler({}));

app.use(morgan());

// Security middlewares
app.use(cors(), helmet());

// Use json middleware to check and parse json body
app.use(json);

// Validate the parameters that contains an id and check that query paramers doesn't contain an array
app.use(enforceQueryString);
app.param(['userId', 'teamId', 'cartId', 'cartItemId'], validateParameter(validators.id));

// Fetch user from database
app.use(initUserRequest);
// Main routes
app.use(env.api.prefix, router);

// Not found
app.use((request: Request, response: Response) => notFound(response, Error.RouteNotFound));

// Error Handles
app.use(errorHandler);

export default app;
