/* eslint-disable import/first */
import dotenv from 'dotenv';

dotenv.config();

import express, { Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import swagger from 'swagger-ui-express';
import bodyParser from 'body-parser';
import { createLogger, format, transports } from 'winston';

import { notFound } from './utils/responses';
import {
  datadogKey,
  isProductionDatabase,
  datadogDevelopment,
  datadogProduction,
  isProduction,
} from './utils/environment';
import { Error, PermissionsRequest } from './types';
import routes from './controllers';
import { checkJson } from './middlewares/checkJson';
import { getIp } from './utils/network';
import swaggerDocument from '../openapi.json';

const app = express();

// Http Transport to DataDog
const httpTransportOptions = {
  host: 'http-intake.logs.datadoghq.com',
  path: `/v1/input/${datadogKey()}?ddsource=nodejs&service=${
    isProductionDatabase() ? datadogProduction() : datadogDevelopment()
  }`,
  ssl: true,
};

// Create winston logger
const logger = createLogger({
  level: 'info',
  exitOnError: false,
  format: format.json(),
  transports: [new transports.Http(httpTransportOptions), new transports.Console()],
});

// Map morgan with winston
const streamAccessLog = {
  write: (text: string) => logger.info(text),
};

// Load morgan variables
morgan.token('username', (request: PermissionsRequest) => (request.permissions ? request.permissions : 'anonymous'));
morgan.token('ip', getIp);

// Loads logging middleware with more verbosity if in dev environment, and enable datadog production environment
app.use(morgan(isProduction() ? 'tiny' : 'dev', isProduction() && { stream: streamAccessLog }));

// Security middlewares
app.use(cors(), helmet());

// Body json middlewares
app.use(bodyParser.json(), checkJson());

// Documentation
app.use('/docs', swagger.serve, swagger.setup(swaggerDocument));

// Uploads
app.use('/uploads', express.static('uploads'));

// Main routes
app.use(routes());

// Not found
app.use((req: Request, res: Response) => notFound(res, Error.RouteNotFound));

export default app;
