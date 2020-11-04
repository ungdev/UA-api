import { Tournament } from '@prisma/client';
import Discord, { GuildMember } from 'discord.js';
import logger from './log';
import { discordServer, discordToken } from './environment';
import removeAccents from './removeAccents';

const bot = new Discord.Client();
let server: Discord.Guild;

export const discordLogin = () =>
  new Promise((resolve) => {
    if (discordToken()) {
      bot.login(discordToken());
      bot.on('ready', () => {
        logger.info('Bot ready');
        server = await bot.guilds.fetch(discordServer(), true, true);

        resolve();
      });
    } else {
      logger.warn('Discord token not entered, you can still continue to dev !');
      resolve();
    }
  });

const getMemberByName = (id: string) =>
  server.members.cache.find((member) => id === `${member.user.username}#${member.user.discriminator}`);

const getMemberUsername = (member: GuildMember) => `${member.user.username}#${member.user.discriminator}`;

const getChannelsByName = (name: string) => server.channels.cache.filter((channel) => channel.name === name);

const getRolesByName = (name: string) => server.roles.cache.filter((role) => role.name === name).array();

/**
 * Convert the name to match the discord text channels restrictions
 * No majuscules, no special characters, replace spaces by tiret
 */
export const getDiscordTeamName = (team: string, tournamentId: string) => {
  let name = `${tournamentId}_${team}`;

  name = name.toLowerCase();
  name = name.trim();

  // Replace multiple spaces or spaces by one tiret
  name = name.replace(/[\s-]+/g, '-');

  // Remove special characters
  name = removeAccents(name).replace(/[^\s\w-_]/g, '');

  return name;
};

export const fetchDiscordParticipants = (tournamentId: string) => {
  const roles = server.roles.cache.array();

  // Filter the role by tournamentId_
  // Warning the staff role mustn't be tournamentId_staff but tournamentId staff
  return roles
    .filter((role) => role.name.startsWith(`${tournamentId}_`))
    .map((role) => ({
      name: role.name,
      discordIds: role.members.map((member) => getMemberUsername(member)),
    }));
};

/**
 * Fetch all users with the tournament's participant role
 * @param tournamentRoleId Tournament discord role id
 */
export const fetchDiscordSoloParticipants = (tournamentRoleId: string) => {
  const tournamentRole = server.roles.cache.get(tournamentRoleId);
  return tournamentRole.members.map((member) => getMemberUsername(member));
};

/**
 * Create a discord team with 2 channels and assign roles
 */
export const createTeam = async (discordTeamName: string, discordIds: Array<string>, tournament: Tournament) => {
  // Create role
  logger.debug(`Create role ${discordTeamName}`);
  const teamRole = await server.roles.create({
    data: {
      name: discordTeamName,
    },
  });

  // Create channels
  const channelTypes: Array<'text' | 'voice'> = ['text', 'voice'];

  // Allow the channel to be viewed only by the tournament staff and the team and the bot (to delete the channel)
  await Promise.all(
    channelTypes.map((channelType) => {
      logger.debug(`Create channel ${channelType}:${discordTeamName}`);

      return server.channels.create(discordTeamName, {
        type: channelType,
        parent: tournament[channelType === 'text' ? 'discordTextCategoryId' : 'discordVocalCategoryId'],
        permissionOverwrites: [
          {
            id: server.roles.everyone.id,
            deny: ['VIEW_CHANNEL'],
          },
          {
            id: teamRole.id,
            allow: ['VIEW_CHANNEL'],
          },
          {
            id: tournament.discordStaffRoleId,
            allow: ['VIEW_CHANNEL'],
          },
        ],
      });
    }),
  );
};

export const deleteTeam = async (discordTeamName: string) => {
  // Delete all channels
  const channels = getChannelsByName(discordTeamName);
  await Promise.all(
    channels.map((channel) => {
      logger.debug(`Delete channel ${channel.type}:${channel.name}`);
      return channel.delete();
    }),
  );

  // Delete role (should always be 1)
  const roles = getRolesByName(discordTeamName);
  await Promise.all(
    roles.map((role) => {
      logger.debug(`Delete role ${role.name}`);
      return role.delete();
    }),
  );
};

/**
 * Delete all channels for each teams and their roles
 */
export const deleteAllTeams = async () => {
  // Filter roles beginning with lowercase letters followed by an underscore
  await Promise.all(
    server.roles.cache
      .filter((role) => /^[a-z]{2,}_/.test(role.name))
      .array()
      .map(async (role) => {
        await deleteTeam(role.name);
      }),
  );
};

/**
 * Add the tournmament role to each register user
 * @param discordTeamName discord team such as lol_awesome-team
 * @param roleId Tournament discord role id
 * @param discordIds Array of discord ID (i.e. johndoe#123)
 */
export const addRolesToUsers = (discordTeamName: string, roleId: string, discordIds: Array<string>) => {
  const roles = getRolesByName(discordTeamName);
  const tournamentRole = server.roles.cache.get(roleId);
  // Check if all members are in discord
  discordIds.forEach((discordId) => {
    if (!getMemberByName(discordId)) {
      logger.warn(`${discordId} isn't on the discord (team ${discordTeamName})`);
    }
  });

  return Promise.all(
    discordIds
      .filter((discordId) => getMemberByName(discordId))
      .map((discordId) => {
        const member = getMemberByName(discordId);
        logger.debug(`Assign roles to ${discordId}`);

        return member.roles.add([...roles, tournamentRole]);
      }),
  );
};

/**
 * Remove the tournmament role to each unregister user
 * @param discordTeamName discord team such as lol_awesome-team
 * @param roleId Tournament discord role id
 * @param discordIds Array of discord ID (i.e. johndoe#123)
 */
export const deleteRolesFromUsers = (discordTeamName: string, roleId: string, discordIds: Array<string>) => {
  const roles = getRolesByName(discordTeamName);
  const tournamentRole = server.roles.cache.get(roleId);

  return Promise.all(
    discordIds
      .filter((discordId) => getMemberByName(discordId))
      .map((discordId) => {
        const member = getMemberByName(discordId);
        logger.debug(`Remove roles to ${discordId}`);

        return member.roles.remove([...roles, tournamentRole]);
      }),
  );
};
