/* eslint-disable unicorn/no-process-exit */
import { PrismaClient } from '@prisma/client';
import { databaseHost, databaseName, databasePassword, databasePort, databaseUsername } from './environment';
import log from './log';

const database = new PrismaClient({
  log: ['query', 'info', 'warn'],
});

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
