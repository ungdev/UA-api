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
import { devEnv, ddKey, dbHost } from './utils/env';
import { Error, PermissionsRequest } from './types';
import routes from './controllers';
import { checkJson } from './middlewares/checkJson';
import { getIp } from './utils/network';
import swaggerDocument from '../openapi.json';

const app = express();

const httpTransportOptions = {
  host: 'http-intake.logs.datadoghq.com',
  path: `/v1/input/${ddKey()}?ddsource=nodejs&service=${
    dbHost() === 'mariadb-prod' ? 'logs-api-ua' : 'logs-api-ua-dev'
  }`,
  ssl: true,
};

const logger = createLogger({
  level: 'info',
  exitOnError: false,
  format: format.json(),
  transports: [
    new transports.Http(httpTransportOptions),
    new transports.Console(),
    new transports.File({ filename: 'logs/access.log' }),
  ],
});

const myStream = {
  write: (text: string) => logger.info(text),
};

morgan.token('username', (req: PermissionsRequest) => (req.permissions ? req.permissions : 'anonymous'));
morgan.token('ip', getIp);

app.use(morgan(devEnv() ? 'dev' : 'tiny', !devEnv() && { stream: myStream }));

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
