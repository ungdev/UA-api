import Sentry from '@sentry/node';
import differenceBy from 'lodash.differenceby';
import difference from 'lodash.difference';
import { fetchTournaments } from '../operations/tournament';

import * as discord from '../utils/discord';
import * as toornament from '../utils/toornament';
import logger from '../utils/log';
import { DiscordParticipants } from '../types';
import { initSentryNode } from '../utils/sentry';

/**
 * Create team roles, assign participant roles and create team channels
 */
(async () => {
  initSentryNode();
  await discord.init();
  await toornament.init();

  const tournaments = await fetchTournaments();

  await Promise.all(
    tournaments
      // Only keep tournaments with a toornamentId
      .filter((tournament) => tournament.toornamentId)
      .map(async (tournament) => {
        const isSoloTournament = tournament.playersPerTeam === 1;

        let discordParticipants: DiscordParticipants[];
        let toornamentParticipants = await toornament.fetchParticipants(tournament.toornamentId, tournament.id);

        // Team tournament case
        if (!isSoloTournament) {
          discordParticipants = discord.fetchParticipantsInTeamTournament(tournament.id);
          toornamentParticipants = toornamentParticipants.map((participant) => ({
            ...participant,
            name: discord.getDiscordTeamName(participant.name, tournament.id),
          }));

          const teamsToAdd = differenceBy(toornamentParticipants, discordParticipants, 'name');
          const teamsToDelete = differenceBy(discordParticipants, toornamentParticipants, 'name');

          await Promise.all(teamsToAdd.map((team) => discord.createTeam(team.name, tournament)));
          await Promise.all(teamsToDelete.map((team) => discord.deleteTeam(team.name)));
        }
        // Solo tournament case
        else {
          // Create one team with all the tournament's participants
          discordParticipants = [
            {
              name: tournament.id,
              discordIds: discord.fetchParticipantsInSoloTournament(tournament.discordRoleId),
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
              await discord.addRolesToUsers(discordParticipant.name, tournament.discordRoleId, usersToAdd);
              await discord.deleteRolesFromUsers(discordParticipant.name, tournament.discordRoleId, usersToDelete);
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
