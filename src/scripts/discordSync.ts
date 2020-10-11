import Sentry from '@sentry/node';
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
  fetchDiscordSoloParticipants,
} from '../utils/discord';
import { toornamentInit, fetchParticipantsDiscordIds } from '../utils/toornament';
import logger from '../utils/log';
import { DiscordParticipants } from '../types';
import { initSentryNode } from '../utils/sentry';

(async () => {
  initSentryNode();
  await discordLogin();
  await toornamentInit();

  const tournaments = await fetchTournaments();

  // Check if the toornament has a toornamentid and a discordCategory (therefore its a team tournament)
  await Promise.all(
    tournaments
      .filter((tournament) => tournament.toornamentId)
      .map(async (tournament) => {
        const isSoloTournament = tournament.playersPerTeam === 1;
        let toornamentParticipants = await fetchParticipantsDiscordIds(tournament.toornamentId);

        let discordParticipants: DiscordParticipants[];

        if (!isSoloTournament) {
          discordParticipants = fetchDiscordParticipants(tournament.id);
          toornamentParticipants = toornamentParticipants.map((participant) => ({
            ...participant,
            name: getDiscordTeamName(participant.name, tournament.id),
          }));

          const teamsToAdd = differenceBy(toornamentParticipants, discordParticipants, 'name');
          const teamsToDelete = differenceBy(discordParticipants, toornamentParticipants, 'name');

          await Promise.all(teamsToAdd.map((team) => createTeam(team.name, team.discordIds, tournament)));
          await Promise.all(teamsToDelete.map((team) => deleteTeam(team.name)));
        } else {
          // Solo tournament case
          // Create one team with all the tournament's participants
          discordParticipants = [
            {
              name: tournament.id,
              discordIds: fetchDiscordSoloParticipants(tournament.discordRoleId),
            },
          ];
          toornamentParticipants = [
            {
              name: tournament.id,
              discordIds: toornamentParticipants.reduce((previous, player) => [...previous, ...player.discordIds], []),
            },
          ];
        }

        await Promise.all(
          toornamentParticipants.map(async (toornamentParticipant) => {
            const discordParticipant = discordParticipants.find(
              (discordParticipant) => discordParticipant.name === toornamentParticipant.name,
            );

            if (discordParticipant) {
              const usersToAdd = difference(toornamentParticipant.discordIds, discordParticipant.discordIds);
              const usersToDelete = difference(discordParticipant.discordIds, toornamentParticipant.discordIds);
              await addRolesToUsers(discordParticipant.name, tournament.discordRoleId, usersToAdd);
              await deleteRolesFromUsers(discordParticipant.name, tournament.discordRoleId, usersToDelete);
            }
          }),
        );
      }),
  );
  process.exit(0);
})().catch((error) => {
  logger.error(error);
  Sentry.captureException(error);
  process.exit(1);
});
