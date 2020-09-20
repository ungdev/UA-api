import morganMiddleware from 'morgan';
import { createLogger, format, silly, transports } from 'winston';
import 'winston-daily-rotate-file';
import moment from 'moment';
import { datadogDevelopment, datadogKey, datadogProduction, isProduction, isProductionDatabase } from './environment';
import { PermissionsRequest } from '../types';
import { getIp } from './network';

// Create console Transport
const { combine, colorize, printf, json } = format;
const timestamp = moment().format('HH:mm:ss');
const consoleTransport = new transports.Console({
  format: combine(
    colorize(),
    printf(({ level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  level: 'silly',
});

// Create datadog transport
const datadogTransport = new transports.Http({
  host: 'http-intake.logs.datadoghq.com',
  path: `/v1/input/${datadogKey()}?ddsource=nodejs&service=${
    isProductionDatabase() ? datadogProduction() : datadogDevelopment()
  }`,
  ssl: true,
  format: json(),
  level: 'http',
});

const developmentTransports = [consoleTransport];
const productionTransports = [consoleTransport, datadogTransport];

const logger = createLogger({
  transports: isProduction() ? productionTransports : developmentTransports,
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
logger.error = (error) => {
  if (error instanceof Error) {
    logger.log({ level: 'error', message: `${error.stack || error}` });
  } else {
    logger.log({ level: 'error', message: error });
  }
};

export default logger;

export const morgan = () => {
  // Map morgan with winston
  const logStream = {
    write: (text: string) => logger.http(text),
  };

  // Load morgan variables
  morganMiddleware.token('username', (request: PermissionsRequest) =>
    request.permissions ? request.permissions : 'anonymous',
  );
  morganMiddleware.token('ip', getIp);

  return morganMiddleware(isProduction() ? 'tiny' : 'dev', { stream: logStream });
};
