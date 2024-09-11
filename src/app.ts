import express, { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { notFound } from './utils/responses';
import { Error } from './types';
import router from './controllers';
import json from './middlewares/json';
import { morgan } from './utils/logger';
import { initUserRequest } from './middlewares/user';
import env from './utils/env';
import errorHandler from './middlewares/errorHandler';
import { enforceQueryString } from './middlewares/validation';
import rateLimiter from './middlewares/ratelimiter';

const app = express();

// Handle rate limiter first, do not enable it in tests !
if (!env.test) app.use(rateLimiter);

// Initiate Sentry
Sentry.init({ dsn: env.log.sentryDsn, environment: env.environment });

// Enable morgan logger
app.use(morgan());

// Enable compression
app.use(compression());

// Security middlewares
app.use(cors(), helmet());

// Use json middleware to check and parse json body
app.use(json);

// Validate the parameters that contains an id and check that query paramers doesn't contain an array
app.use(enforceQueryString);

// Fetch user from database
app.use(initUserRequest);
// Main routes
app.use(env.api.prefix, router);

// Not found
app.use((request: Request, response: Response) => notFound(response, Error.RouteNotFound));

// Error Handles
app.use(errorHandler);

export default app;
