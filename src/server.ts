import { apiPort, nodeEnv as nodeEnvironment } from './utils/environment';
import log from './utils/log';
import app from './app';

// Listen the API on port 3000 (default)
app.listen(apiPort(), () => {
  log.info(`Node environment: ${nodeEnvironment()}`);
  log.info(`Listening on ${apiPort()}...`);
});
