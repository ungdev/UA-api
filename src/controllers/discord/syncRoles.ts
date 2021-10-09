import { NextFunction, Request, Response } from 'express';
import { success, unauthenticated } from '../../utils/responses';
import { Error } from '../../types';
import { syncRoles } from '../../utils/discord';
import env from '../../utils/env';
import logger, { WinstonLog } from '../../utils/logger';

export default [
  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { token } = request.body;

      // Checks if a token was given
      if (!token) {
        return unauthenticated(response, Error.NoToken);
      }

      // Checks if the token is valid
      // eslint-disable-next-line security/detect-possible-timing-attacks
      if (token !== env.discord.syncKey) {
        return unauthenticated(response, Error.InvalidToken);
      }

      let logs: WinstonLog[] = [];

      // Listen to all logs in the sync roles function to add it to the answer
      const loggerListener = (log: WinstonLog) => logs.push(log);
      logger.addListener('data', loggerListener);
      await syncRoles();

      logger.removeListener('data', loggerListener);

      // Remove silly logs
      logs = logs.filter((log) => log.level !== 'silly');

      return success(response, { logs });
    } catch (error) {
      return next(error);
    }
  },
];
