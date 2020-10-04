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
import { toornamentInit, fetchParticipantsDiscordIds } from '../utils/toornament';
import logger from '../utils/log';

(async () => {
  await discordLogin();
  await toornamentInit();

  const tournaments = await fetchTournaments();

  // Check if the toornament has a toornamentid and a discordCategory (therefore its a team tournament)
  await Promise.all(
    tournaments
      .filter((tournament) => tournament.toornamentId && tournament.discordCategoryId)
      .map(async (tournament) => {
        let toornamentParticipants = await fetchParticipantsDiscordIds(tournament.toornamentId);

        toornamentParticipants = toornamentParticipants.map((participant) => ({
          ...participant,
          name: getDiscordTeamName(participant.name, tournament.id),
        }));

        const discordParticipants = fetchDiscordParticipants(tournament.id);

        const teamsToAdd = differenceBy(toornamentParticipants, discordParticipants, 'name');
        const teamsToDelete = differenceBy(discordParticipants, toornamentParticipants, 'name');

        await Promise.all(teamsToAdd.map((team) => createTeam(team.name, team.discordIds, tournament)));
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
