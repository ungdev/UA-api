import { readFileSync } from 'fs';
import { UserType } from '.prisma/client';
import { fetchTeams } from '../operations/team';
import { fetchTournaments } from '../operations/tournament';
import { fetchUsers, updateCompumsaCode } from '../operations/user';
import { UserSearchQuery } from '../types';
import logger from '../utils/logger';

(async () => {
  const codes: Int16Array = JSON.parse(readFileSync('compumsaCodes.json').toString());
  let index = 0;

  // tournaments
  //   locked teams
  //     players

  // get all users in locked teams
  const tournaments = await fetchTournaments();
  for (const tournament of tournaments) {
    const teams = await fetchTeams(tournament.id);
    const lockedTeams = teams.filter((team) => team.lockedAt);
    for (const team of lockedTeams) {
      const userSearch = {
        search: team.name,
        type: UserType.player,
      } as UserSearchQuery & { page?: string };
      const [players] = await fetchUsers(userSearch, 0);
      // seed the code
      for (const player of players) {
        updateCompumsaCode(player.id, codes[index++]);
        // eslint-disable-next-line no-console
        console.log(player.team.tournament.id, player.team.name, player.username, codes[index - 1]);
      }
    }
  }
})().catch((error) => {
  logger.error(error);
});
