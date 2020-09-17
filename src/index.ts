/* eslint-disable import/first */
import dotenv from 'dotenv';

dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import swagger from 'swagger-ui-express';
import yaml from 'yamljs';
import bodyParser from 'body-parser';
import { createLogger, format, transports } from 'winston';

import database from './database';
import { notFound } from './utils/responses';
import log from './utils/log';
import { devEnv, nodeEnv, apiPort, ddKey, dbHost } from './utils/env';
import { Error, PermissionsRequest } from './types';
import routes from './controllers';
import { checkJson } from './middlewares/checkJson';
import { getIp } from './utils/network';

const app = express();
const server = http.createServer(app);

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

(async () => {
  try {
    await database();

    morgan.token('username', (req: PermissionsRequest) => (req.permissions ? req.permissions : 'anonymous'));
    morgan.token('ip', getIp);

    app.use(morgan(devEnv() ? 'dev' : 'tiny', !devEnv() && { stream: myStream }));

    // Security middlewares
    app.use(cors(), helmet());

    // Body json middlewares
    app.use(bodyParser.json(), checkJson());

    // Documentation
    const swaggerDocument = await yaml.load('openapi.yml');
    app.use('/docs', swagger.serve, swagger.setup(swaggerDocument));

    // Uploads
    app.use('/uploads', express.static('uploads'));

    // Main routes
    app.use(routes());

    // Not found
    app.use((req: Request, res: Response) => notFound(res, Error.RouteNotFound));

    server.listen(apiPort(), () => {
      log.info(`Node environment: ${nodeEnv()}`);
      log.info(`Listening on ${apiPort()}...`);
    });
  } catch (err) {
    log.error(err);
  }
})();
