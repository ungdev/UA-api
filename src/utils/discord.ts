import { TournamentId } from '.prisma/client';
import { fetchTournaments, fetchTournament } from '../operations/tournament';
import { fetchTeams } from '../operations/team';
import {
  createDiscordChannel,
  createDiscordRole,
  fetchDiscordRoles,
  findDiscordRoleById,
  findDiscordMemberById,
  addDiscordMemberRole,
} from '../services/discord';
import {
  DiscordChannelPermission,
  DiscordChannelPermissionType,
  DiscordChannelType,
  DiscordRole,
} from '../controllers/discord/discordApi';
import database from '../services/database';
import { Team, Tournament } from '../types';
import env from './env';
import logger from './logger';

let everyoneRole: DiscordRole;

const createDiscordTeamChannel = async (
  channelName: string,
  channelType: DiscordChannelType,
  tournamentId: TournamentId,
  teamRole: DiscordRole,
) => {
  const tournament = await fetchTournament(tournamentId);

  return createDiscordChannel({
    name: channelName,
    type: channelType,
    parent_id: tournament.discordCategoryId,
    permission_overwrites: [
      {
        id: everyoneRole.id,
        type: DiscordChannelPermissionType.ROLE,
        deny: DiscordChannelPermission.VIEW_CHANNEL,
      },
      {
        id: tournament.discordRespoRoleId,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.VIEW_CHANNEL,
      },
      {
        id: teamRole.id,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.VIEW_CHANNEL,
      },
    ],
  });
};

export const setupDiscordTeam = async (team: Team, tournament: Tournament) => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }

  // Only create channel if there are more than 1 player per team
  if (tournament.playersPerTeam !== 1) {
    const role = await createDiscordRole({ name: team.name, color: 0xff_eb_ab });

    logger.debug(`Create discord channels for ${team.name}`);
    // Create the channels and update in the database the role.
    await Promise.all([
      createDiscordTeamChannel(team.name, DiscordChannelType.GUILD_TEXT, tournament.id, role),
      createDiscordTeamChannel(team.name, DiscordChannelType.GUILD_VOICE, tournament.id, role),
      database.team.update({ data: { discordRoleId: role.id }, where: { id: team.id } }),
    ]);
  }
};

export const syncRoles = async () => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }

  // Get the server, loop all tournaments, loop all teams in tournaments and loop all player in teams to give them the role
  for (const tournament of await fetchTournaments()) {
    // Do not care about the solo tournaments
    if (tournament.playersPerTeam === 1) {
      continue;
    }
    const tournamentRole = await findDiscordRoleById(tournament.discordRoleId);

    for (const team of await fetchTeams(tournament.id)) {
      // Do not care about the non-locked teams
      if (team.lockedAt === null) {
        continue;
      }

      const users = [...team.players, ...team.coaches];

      // Only parallelize the requests per user to avoid beging rate limited
      await Promise.all(
        users.map(async (user) => {
          try {
            // Make this call only to check if the member is in the server
            await findDiscordMemberById(user.discordId);

            logger.debug(`Add roles to user ${user.username}`);

            await Promise.all([
              addDiscordMemberRole(user.discordId, tournamentRole.id),
              addDiscordMemberRole(user.discordId, team.discordRoleId),
            ]);
          } catch (error) {
            // Check if the error corresponds to a member not in the server
            if (error?.response?.data?.code === 10_007) {
              logger.warn(`[${tournament.id}][${team.name}] ${user.username} is not on discord`);
            } else throw error;
          }
        }),
      );
    }
  }
};

// Load everyone role on server start to avoid one discord call on lockTeam
if (env.discord.token) {
  fetchDiscordRoles().then((roles) => {
    everyoneRole = roles.find((role) => role.name === '@everyone');
    logger.debug('Discord @everyone role loaded');
  });
}
