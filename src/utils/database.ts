/* eslint-disable unicorn/no-process-exit */
import { PrismaClient } from '@prisma/client';
import { databaseHost, databaseName, databasePassword, databasePort, databaseUsername, isTest } from './environment';
import log from './log';

const database = new PrismaClient(
  !isTest() && {
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
  },
);

database.$on('query', (event) => log.debug(event.query));
database.$on('info', (event) => log.info(event.message));
database.$on('warn', (event) => log.warn(event.message));

// Dump query to initiate the connection
const setup = async () => {
  process.env.DATABASE_URL = `mysql://${databaseUsername()}:${databasePassword()}@${databaseHost()}:${databasePort()}/${databaseName()}`;
  await database.settings.findMany();
};

setup().catch((error) => {
  log.error(error);
  process.exit(1);
});

export default database;
