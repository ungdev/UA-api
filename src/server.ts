import env from './utils/env';
import logger from './utils/logger';
import app from './app';

try {
  // Listen the API on port 3000 (default)
  app.listen(env.api.port, () => {
    logger.debug(`Node environment: ${process.env.NODE_ENV}`);
    logger.debug(`Listening on ${env.api.port}...`);
  });
} catch (error) {
  logger.error(error);
}
