import Sentry from '@sentry/node';
import { fetchTournaments } from '../operations/tournament';

import * as discord from '../utils/discord';
import logger from '../utils/log';
import { initSentryNode } from '../utils/sentry';

(async () => {
  initSentryNode();
  await discord.init();

  const tournaments = await fetchTournaments();

  // Delete all teams
  logger.info('Delete all teams...');
  await discord.deleteAllTeams();

  const roleIds = tournaments.map((tournament) => tournament.discordRoleId);

  // Unassign tournament roles
  logger.info('Unassign tournaments roles...');
  await discord.unassignRoles(roleIds);

  process.exit(0);
})().catch((error) => {
  logger.error(error);
  Sentry.captureException(error);
  process.exit(1);
});
