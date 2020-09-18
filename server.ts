import { PrismaClient } from '@prisma/client';

import { apiPort, nodeEnv } from './src/utils/env';
import log from './src/utils/log';
import app from './src/app';

const db = new PrismaClient({
  log: ['query', 'info', 'warn'],
});

try {
  app.listen(apiPort(), () => {
    log.info(`Node environment: ${nodeEnv()}`);
    log.info(`Listening on ${apiPort()}...`);
  });
} catch (error) {
  log.error(error);
  throw error;
} finally {
  db.$disconnect();
}

export default db;
