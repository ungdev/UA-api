/* eslint-disable unicorn/no-process-exit */
import { PrismaClient } from '@prisma/client';
import env from '../utils/env';
import logger from '../utils/logger';

const database = new PrismaClient({
  // Enable color format if in development
  errorFormat: env.development ? 'pretty' : 'colorless',
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

// If we are in development, enables database logging
if (env.development) {
  database.$on('query', (event) => logger.debug(event.query));
  database.$on('info', (event) => logger.info(event.message));
  database.$on('warn', (event) => logger.warn(event.message));
}

// Dump query to initiate the connection
const setup = async () => {
  process.env.DATABASE_URL = `mysql://${env.database.username}:${env.database.password}@${env.database.host}:${env.database.port}/${env.database.name}`;
  await database.setting.findMany();
};

setup().catch((error) => {
  logger.error(error);
  process.exit(1);
});

export default database;
