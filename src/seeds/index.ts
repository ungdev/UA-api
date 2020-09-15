/* eslint-disable import/first */
import dotenv from 'dotenv';

dotenv.config();

import { getConnection } from 'typeorm';
import database from '../database';
import log from '../utils/log';
import { devEnv } from '../utils/env';
import seedItems from './items';
import seedSettings from './settings';
import seedTournaments from './tournaments';

(async () => {
  try {
    if (!devEnv()) {
      log.error("Can't seed in production. Please start with `NODE_ENV=development yarn seed` if you are sure.");
      process.exit(1);
    }

    const connection = await database(true);

    await seedItems();
    await seedSettings();
    await seedTournaments();

    connection.close();
  } catch (err) {
    log.error(err.toString());

    if (getConnection()) {
      getConnection().close();
    }

    process.exit(1);
  }
})();
