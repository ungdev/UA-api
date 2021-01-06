import { fetchTournaments } from '../operations/tournament';

import * as discord from '../utils/discord';
import logger from '../utils/logger';

(async () => {
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
  process.exit(1);
});
