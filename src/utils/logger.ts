/* eslint-disable no-console */
import { Request, Response } from 'express';
import { ConsoleTransportInstance } from 'winston/lib/winston/transports';
import split from 'split';
import morganMiddleware from 'morgan';
import { createLogger, format, transports } from 'winston';
import moment from 'moment';
import { getIp } from './network';
import { getRequestInfo } from './user';
import env, { warnLogs } from './env';

// We can't require env here or we will have a require loop

// Create console Transport
const { combine, colorize, printf } = format;
const consoleTransport = new transports.Console({
  format: combine(
    colorize(),
    printf(({ level, message }) => `${moment().format('HH:mm:ss')} ${level}: ${message}`),
  ),
  level: env.log.level,
  silent: env.test, // Doesn't log if we are in testing environment
});

const loggingTransports: Array<ConsoleTransportInstance> = [consoleTransport];

// Create the production/development logger
const logger = createLogger({
  transports: loggingTransports,
});

// @ts-ignore
logger.error = (error) => {
  if (error instanceof Error) {
    logger.log({ level: 'error', message: `${error.stack || error}` });
  } else {
    logger.log({ level: 'error', message: error });
  }
};

// Logs the warning produced by the env file
for (const log of warnLogs) {
  logger.warn(log);
}

export default logger;

/**
 * Creates a morgan middleware with ip and username varibles
 * The logging is more verbose when in production
 */
export const morgan = () => {
  // Map morgan with winston
  // Split allows to remove the additional newline generated by the stream
  const logStream = split().on('data', (message: string) => logger.http(message));

  // Load morgan variables
  morganMiddleware.token('username', (request: Request, response: Response) => {
    const { user } = getRequestInfo(response);
    return (user && user.username) || 'anonymous';
  });
  morganMiddleware.token('ip', getIp);

  const productionFormat = ':ip :username :method :url :status :res[content-length] - :response-time ms';
  const developmentFormat = ':method :url :status :response-time ms - :res[content-length] - :username';

  // We use process.env.NODE_ENV because this file is imported by env.js
  return morganMiddleware(process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat, {
    stream: logStream,
  });
};
