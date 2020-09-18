import { apiPort, nodeEnv } from './utils/env';
import log from './utils/log';
import app from './app';

// Listen the API on port 3000 (default)
app.listen(apiPort(), () => {
  log.info(`Node environment: ${nodeEnv()}`);
  log.info(`Listening on ${apiPort()}...`);
});
