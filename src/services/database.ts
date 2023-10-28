// Prisma auto loads the .env file, but it has already been loaded by the env module.
// So we save the variables, import and initialize prisma, and the set the variables back.
/* eslint-disable import/first */
const envBackup = { ...process.env };
import { PrismaClient } from '@prisma/client';

import env from '../utils/env';
import logger from '../utils/logger';

const database = new PrismaClient({
  // Enable color format if in development
  errorFormat: 'pretty',
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Put back the .env
process.env = envBackup;

// If we are not in production, enables database logging
// The logging level is reduced as prisma produces lots of logs
if (!env.production) {
  database.$on('query', (event) => logger.debug(event.query));
  database.$on('info', (event) => logger.debug(event.message));
  database.$on('warn', (event) => logger.warn(event.message));
}

const setup = async () => {
  await database.setting.findMany();
};
setup().catch((error) => {
  logger.error(error);
  process.exit(1);
});

export default database;
