import env from './utils/env';
import log from './utils/logger';
import app from './app';

try {
  // Listen the API on port 3000 (default)
  app.listen(env.api.port, () => {
    log.debug(`Node environment: ${process.env.NODE_ENV}`);
    log.debug(`Listening on ${env.api.port}...`);
  });
} catch (error) {
  log.error(error);
}
