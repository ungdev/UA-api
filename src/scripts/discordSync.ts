import differenceBy from 'lodash.differenceby';
import difference from 'lodash.difference';
import { fetchTournaments } from '../operations/tournament';

import {
  createTeam,
  deleteTeam,
  discordLogin,
  fetchDiscordParticipants,
  getDiscordTeamName,
  addRolesToUsers,
  deleteRolesFromUsers,
} from '../utils/discord';
import { toornamentInit, fetchParticipants } from '../utils/toornament';
import logger from '../utils/log';

(async () => {
  await discordLogin();
  await toornamentInit();

  const tournaments = await fetchTournaments();

  // Check if the toornament has a toornamentid and a discordroleid (therefore all discord ids)
  await Promise.all(
    tournaments
      .filter((tournament) => tournament.toornamentId && tournament.discordRoleId)
      .map(async (tournament) => {
        const toornamentParticipants = (await fetchParticipants(tournament.toornamentId)).map((participant) => ({
          ...participant,
          name: getDiscordTeamName(participant.name, tournament.id),
        }));

        const discordParticipants = await fetchDiscordParticipants(tournament.id);

        const teamsToAdd = differenceBy(toornamentParticipants, discordParticipants, 'name');
        const teamsToDelete = differenceBy(discordParticipants, toornamentParticipants, 'name');

        await Promise.all(teamsToAdd.map((team) => createTeam(team.name, team.discordIds, tournament.id)));
        await Promise.all(teamsToDelete.map((team) => deleteTeam(team.name)));

        await Promise.all(
          toornamentParticipants.map(async (toornamentParticipant) => {
            const discordParticipant = discordParticipants.find(
              (discordParticipant) => discordParticipant.name === toornamentParticipant.name,
            );

            if (discordParticipant) {
              const usersToAdd = difference(toornamentParticipant.discordIds, discordParticipant.discordIds);
              const usersToDelete = difference(discordParticipant.discordIds, toornamentParticipant.discordIds);

              await addRolesToUsers(discordParticipant.name, usersToAdd);
              await deleteRolesFromUsers(discordParticipant.name, usersToDelete);
            }
          }),
        );
      }),
  );
})().catch(logger.error);
