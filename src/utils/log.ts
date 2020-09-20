/* eslint-disable no-console */
import { ConsoleTransportInstance, HttpTransportInstance } from 'winston/lib/winston/transports';
import morganMiddleware from 'morgan';
import { createLogger, format, transports } from 'winston';
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

const loggingTransports: Array<ConsoleTransportInstance | HttpTransportInstance> = [consoleTransport];

// Create datadog transport
if (isProduction()) {
  const datadogPath = `/v1/input/${datadogKey()}?ddsource=nodejs&service=${
    isProductionDatabase() ? datadogProduction() : datadogDevelopment()
  }`;
  console.info(`Datadog URL: ${datadogPath}`);
  const datadogTransport = new transports.Http({
    host: 'http-intake.logs.datadoghq.com',
    path: datadogPath,
    ssl: true,
    format: json(),
    level: 'http',
  });
  // Log if datadog is unreachable/forbidden
  datadogTransport.on('warn', (warning) => console.warn(`Datadog ${warning}`));

  loggingTransports.push(datadogTransport);
}

// Create the production/developpment logger
const logger = createLogger({
  transports: loggingTransports,
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

/**
 * Creates a morgan middleware with ip and username varibles
 * The logging is more verbose when in production
 */
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

  return morganMiddleware(isProduction() ? 'short' : 'dev', { stream: logStream });
};
