/* eslint-disable import/first */
import dotenv from 'dotenv';

dotenv.config();

import { apiPort, nodeEnv as nodeEnvironment } from './utils/environment';
import log from './utils/log';
import app from './app';

// Listen the API on port 3000 (default)
app.listen(apiPort(), () => {
  log.debug(`Node environment: ${nodeEnvironment()}`);
  log.debug(`Listening on ${apiPort()}...`);
});
