import { TournamentId } from '.prisma/client';
import { fetchTournaments, fetchTournament } from '../operations/tournament';
import { fetchTeams } from '../operations/team';
import { createDiscordChannel, createDiscordRole, fetchGuildMembers, setMemberRoles } from '../services/discord';
import {
  DiscordChannelPermission,
  DiscordChannelPermissionType,
  DiscordChannelType,
  DiscordRole,
  Snowflake,
} from '../controllers/discord/discordApi';
import database from '../services/database';
import { Team, Tournament } from '../types';
import env from './env';
import logger from './logger';

const createDiscordTeamChannel = async (
  channelName: string,
  channelType: DiscordChannelType,
  tournamentId: TournamentId,
  teamRole: DiscordRole,
  parentId: Snowflake,
) => {
  const tournament = await fetchTournament(tournamentId);

  return createDiscordChannel({
    name: channelName,
    type: channelType,
    parent_id: parentId,
    permission_overwrites: [
      {
        // The discord server id corresponds to @everyone role id
        // https://discord.com/developers/docs/topics/permissions#role-object
        id: env.discord.server,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.DEFAULT,
        deny: DiscordChannelPermission.VIEW_CHANNEL,
      },
      {
        id: tournament.discordRespoRoleId,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.VIEW_CHANNEL,
        deny: DiscordChannelPermission.DEFAULT,
      },
      {
        id: teamRole.id,
        type: DiscordChannelPermissionType.ROLE,
        allow: DiscordChannelPermission.VIEW_CHANNEL,
        deny: DiscordChannelPermission.DEFAULT,
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
    const role = await createDiscordRole({ name: team.name, color: env.discord.teamRoleColor });

    logger.debug(`Create discord channels for ${team.name}`);
    // Create the channels and update in the database the role.
    await Promise.all([
      createDiscordTeamChannel(
        team.name,
        DiscordChannelType.GUILD_TEXT,
        tournament.id,
        role,
        tournament.discordTextCategoryId,
      ),
      createDiscordTeamChannel(
        team.name,
        DiscordChannelType.GUILD_VOICE,
        tournament.id,
        role,
        tournament.discordVocalCategoryId,
      ),
      database.team.update({ data: { discordRoleId: role.id }, where: { id: team.id } }),
    ]);
  }
};

export const syncRoles = async () => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }

  // First step: download the entire guild member list from discord
  const guildMembers = await fetchGuildMembers();

  // Get the server, loop all tournaments, loop all teams in tournaments and loop all player in teams to give them the role
  for (const tournament of await fetchTournaments()) {
    // Do not care about the solo tournaments
    if (tournament.playersPerTeam === 1) {
      continue;
    }

    for (const team of await fetchTeams(tournament.id)) {
      // Do not care about the non-locked teams
      if (team.lockedAt === null) {
        continue;
      }

      const users = [...team.players, ...team.coaches];

      // Using a for loop not to parallelize too much requests to the discord api
      // (discord limit is 50 requests per second)
      for (const user of users) {
        // Retrieve the guildmember corresponding to the user (if it exists)
        const member = guildMembers.find((guildMember) => guildMember.user.id === user.discordId);
        // Jump to next member if member does not exist or if member already has the roles
        if (!member || (member.roles.includes(tournament.discordRoleId) && member.roles.includes(team.discordRoleId)))
          continue;
        const updatedMember = await setMemberRoles(member.user.id, [
          ...member.roles,
          tournament.discordRoleId,
          team.discordRoleId,
        ]);
        // Check that we were not rate limited before logging role addition
        if (updatedMember) logger.debug(`Added roles to user ${user.username}`);
      }
    }
  }
};
