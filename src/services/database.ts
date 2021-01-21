/* eslint-disable unicorn/no-process-exit */
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

// If we are not in production, enables database logging
if (!env.production) {
  database.$on('query', (event) => logger.silly(event.query));
  database.$on('info', (event) => logger.debug(event.message));
  database.$on('warn', (event) => logger.warn(event.message));
}

const setup = async () => {
  process.env.DATABASE_URL = `mysql://${env.database.username}:${env.database.password}@${env.database.host}:${env.database.port}/${env.database.name}`;
  await database.setting.findMany();
};
setup().catch((error) => {
  logger.error(error);
  process.exit(1);
});

export default database;
