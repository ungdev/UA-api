/* eslint-disable import/no-unresolved */
import { fetchTournaments, fetchTournament } from '../operations/tournament';
import { fetchTeam, fetchTeams } from '../operations/team';
import {
  createDiscordChannel,
  createDiscordRole,
  fetchGuildMembers,
  addMemberRole,
  fetchGuildMember,
  removeMemberRole,
} from '../services/discord';
import {
  DiscordChannelPermission,
  DiscordChannelPermissionType,
  DiscordChannelType,
  DiscordRole,
  Snowflake,
} from '../controllers/discord/discordApi';
import database from '../services/database';
import { Team, Tournament, TournamentId, User } from '../types';
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
    for (const team of await fetchTeams(tournament.id)) {
      // Do not care about the non-locked teams
      if (team.lockedAt === null) {
        continue;
      }

      const users = [...team.players, ...team.coaches];

      // Using a for loop not to parallelize too much requests to the discord api
      for (const user of users) {
        // Retrieve the guildmember corresponding to the user (if it exists)
        const member = guildMembers.find((guildMember) => guildMember.user.id === user.discordId);
        // Jump to next member if member does not exist
        if (!member) continue;

        // If the member doesn't have the tournament role, add it
        if (!member.roles.includes(tournament.discordRoleId)) {
          logger.debug(`Add ${tournament.id} tournament role to ${user.username}`);
          await addMemberRole(member.user.id, tournament.discordRoleId);
        }

        // If the team has a role id (not for discord roles) and the member doesn't have it, add it
        if (team.discordRoleId && !member.roles.includes(team.discordRoleId)) {
          logger.debug(`Add ${team.name} team (${tournament.id}) role to ${user.username}`);
          await addMemberRole(member.user.id, team.discordRoleId);
        }
      }
    }
  }
};

/**
 * Removes {@link Team#discordRoleId} and {@link Tournament#discordRoleId}
 * from a given {@link User}
 * @param fromUser the user to remove discord roles from
 */
export const removeDiscordRoles = async (fromUser: User) => {
  if (!env.discord.token) {
    logger.warn('Discord token missing. It will skip discord calls');
    return;
  }

  // Abort while the user has neither linked discord account nor team
  if (!fromUser.discordId || !fromUser.teamId) return;
  const team = await fetchTeam(fromUser.teamId);
  // Abort while the team is unlocked or detached from any tournament
  if (!team.tournamentId || !team.lockedAt) return;
  const tournament = await fetchTournament(team.tournamentId);

  // We have all roles here. Fetch the roles of the DiscordGuildMember
  // before trying to remove them (as it is a different route, we won't
  // increase the role rate limits)
  try {
    const discordGuildMember = await fetchGuildMember(fromUser.discordId);
    if (team.discordRoleId && discordGuildMember.roles.includes(team.discordRoleId))
      await removeMemberRole(fromUser.discordId, team.discordRoleId);
    if (tournament.discordRoleId && discordGuildMember.roles.includes(tournament.discordRoleId))
      await removeMemberRole(fromUser.discordId, tournament.discordRoleId);
  } catch (error) {
    if (!error.response || error.response.status !== 404) throw error;
    // Uh uh... It seems the discord member doesn't exist
    // Or the role has been deleted - but don't care as we wanted to remove it
    // You have left the server. How dare you ?!
  }
};
