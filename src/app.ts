import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swagger from 'swagger-ui-express';
import bodyParser from 'body-parser';

import { notFound } from './utils/responses';
import { Error } from './types';
import routes from './controllers';
import { checkJson } from './middlewares/checkJson';
import swaggerDocument from '../openapi.json';
import { morgan } from './utils/log';

const app = express();

// Loads logging middleware with more verbosity if in dev environment, and enable datadog production environment
app.use(morgan());

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
app.use((request: Request, response: Response) => notFound(response, Error.RouteNotFound));

export default app;
