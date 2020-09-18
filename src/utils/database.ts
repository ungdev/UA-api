import { PrismaClient } from '@prisma/client';
import log from './log';

const database = new PrismaClient({
  log: ['query', 'info', 'warn'],
});

// Dump query to initiate the connection
const setup = async () => {
  await database.settings.findMany();
};

setup().catch((error) => {
  log.error(error);
  throw error;
});

export default database;
