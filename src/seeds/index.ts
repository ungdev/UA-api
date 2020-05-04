import { getConnection } from 'typeorm';
import dotenv from 'dotenv';
import database from '../database';
import log from '../utils/log';
import { devEnv } from '../utils/env';
import tournaments from './tournaments';
import items from './items';

(async () => {
  try {
    dotenv.config();

    if (!devEnv()) {
      log.error("Can't seed in production. Please start with NODE_ENV=development yarn seed");
      process.exit(1);
    }

    const connection = await database(true);

    await tournaments();
    await items();

    connection.close();
  } catch (err) {
    log.error(err.toString());
    if (getConnection()) {
      getConnection().close();
    }

    process.exit(1);
  }
})();
