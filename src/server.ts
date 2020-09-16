/* eslint-disable import/first */
import dotenv from 'dotenv';

dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import swagger from 'swagger-ui-express';
import yaml from 'yamljs';
import bodyParser from 'body-parser';
import apmNode from 'elastic-apm-node';

import database from './database';
import { notFound } from './utils/responses';
import log from './utils/log';
import { devEnv, nodeEnv, apiPort, dbHost } from './utils/env';
import { Error, PermissionsRequest } from './types';
import routes from './controllers';
import { checkJson } from './middlewares/checkJson';
import { getIp } from './utils/network';

const apm = apmNode.start({
  serviceName: dbHost() === 'mariadb-prod' ? 'ua-api-logs' : 'ua-api-logs-dev',
  serverUrl: 'https://apm.dev.uttnetgroup.fr/',
  active: nodeEnv() === 'production',
});

const app = express();
const server = http.createServer(app);

(async () => {
  try {
    await database();

    app.use(morgan(devEnv() ? 'dev' : 'combined'));

    morgan.token('username', (req: PermissionsRequest) => (req.permissions ? req.permissions : 'anonymous'));
    morgan.token('ip', getIp);

    if (!devEnv()) {
      app.use(
        morgan(':ip - :username - [:date[clf]] :method :status :url - :response-time ms', {
          stream: fs.createWriteStream(`logs/access.log`, { flags: 'a' }),
          skip: (req) => req.method === 'OPTIONS' || req.method === 'GET',
        }),
      );
    }

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
