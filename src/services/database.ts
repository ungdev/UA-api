/* eslint-disable unicorn/no-process-exit */
import { PrismaClient } from '@prisma/client';
import env from '../utils/env';
import log from '../utils/logger';

const database = new PrismaClient({
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
  database.$on('query', (event) => log.debug(event.query));
  database.$on('info', (event) => log.info(event.message));
  database.$on('warn', (event) => log.warn(event.message));
}

// Dump query to initiate the connection
const setup = async () => {
  process.env.DATABASE_URL = `mysql://${env.database.username}:${env.database.password}@${env.database.host}:${env.database.port}/${env.database.name}`;
  await database.setting.findMany();
};

setup().catch((error) => {
  log.error(error);
  process.exit(1);
});

export default database;
