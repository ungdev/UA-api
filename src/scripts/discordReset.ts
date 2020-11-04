import Sentry from '@sentry/node';

import { discordLogin, deleteAllTeams } from '../utils/discord';
import logger from '../utils/log';
import { initSentryNode } from '../utils/sentry';

(async () => {
  initSentryNode();
  await discordLogin();

  // Delete all teams
  await deleteAllTeams();
})().catch((error) => {
  logger.error(error);
  Sentry.captureException(error);
  process.exit(1);
});
