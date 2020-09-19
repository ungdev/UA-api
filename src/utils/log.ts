import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import moment from 'moment';
import { developmentEnv as developmentEnvironment } from './environment';
import { LoggingLevel } from '../types';

const createEnvironmentLogger = (name: string, level: LoggingLevel = LoggingLevel.Info) => {
  const { combine, colorize, printf } = format;

  const timestamp = moment().format('HH:mm:ss');

  const printFormat = printf(({ level, message }) => `${timestamp} ${level}: ${message}`);

  const consoleTransport = new transports.Console({
    format: combine(colorize(), printFormat),
  });

  // There is a conditional operator to prevent creating files in a development environment
  const rotateTransport = !developmentEnvironment()
    ? new transports.DailyRotateFile({
        filename: `logs/${name}/%DATE%.log`,
        frequency: '1d',
        datePattern: 'YYYY-MM-DD',
        level,
        format: printFormat,
      })
    : undefined;

  const developmentTransports = [consoleTransport];
  const productionTransports = [
    consoleTransport,
    rotateTransport,
    new transports.File({ filename: 'logs/error.log', level: 'error', format: printFormat }),
  ];

  // if (slackAlertWebhook()) {
  //   // @ts-ignore
  //   prodTransports.push(new SlackTransport({ webhookUrl: slackAlertWebhook(), level: 'error' }));
  // }

  const logger = createLogger({
    transports: developmentEnvironment() ? developmentTransports : productionTransports,
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

  return logger;
};

export default createEnvironmentLogger('errors', LoggingLevel.Error);
export const teamJoin = createEnvironmentLogger('teamJoin');
