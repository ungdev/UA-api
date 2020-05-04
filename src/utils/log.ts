import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import moment from 'moment';
import { devEnv } from './env';

const createEnvironmentLogger = (name: string, level = 'info') => {
  const { combine, colorize, printf } = format;

  const timestamp = moment().format('HH:mm:ss');

  const printFormat = printf(({ level, message }) => `${timestamp} ${level}: ${message}`);

  const consoleTransport = new transports.Console({
    format: combine(colorize(), printFormat),
  });

  // There is a triangular condition to prevent creating files in a development environment
  const rotateTransport = !devEnv()
    ? new transports.DailyRotateFile({
        filename: `logs/${name}/%DATE%.log`,
        frequency: '1d',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        level,
        format: printFormat,
      })
    : undefined;

  const devTransports = [consoleTransport];
  const prodTransports = [
    consoleTransport,
    rotateTransport,
    new transports.File({ filename: 'logs/error.log', level: 'error', format: printFormat }),
  ];

  // if (slackAlertWebhook()) {
  //   // @ts-ignore
  //   prodTransports.push(new SlackTransport({ webhookUrl: slackAlertWebhook(), level: 'error' }));
  // }

  const logger = createLogger({
    transports: devEnv() ? devTransports : prodTransports,
  });

  // @ts-ignore
  logger.error = (err) => {
    if (err instanceof Error) {
      logger.log({ level: 'error', message: `${err.stack || err}` });
    } else {
      logger.log({ level: 'error', message: err });
    }
  };

  return logger;
};

export default createEnvironmentLogger('errors', 'error');
export const teamJoin = createEnvironmentLogger('teamJoin');
