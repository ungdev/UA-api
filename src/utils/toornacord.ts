import Discord from 'discord.js';
import { Request } from 'express';
import axios from 'axios';
import { toornamentCredentials } from './toornament';
import { PlayerToornament, WebhookToornament } from '../types';
import logger from './log';
import { fetchTournament } from '../operations/tournament';
import { discordServer, discordToken } from './environment';

// Discord permission scope needed: 268436496 (manage roles, manage channels and view channels)

const baseURL = 'https://api.toornament.com/organizer/v2/tournaments';

const fetchParticipants = async (webhookToornament: WebhookToornament) => {
  const token = webhookToornament.object_type.startsWith('registration')
    ? toornamentCredentials.registrationToken
    : toornamentCredentials.participantToken;
  const toornamentParticipants = await axios.get(
    `${baseURL}/${webhookToornament.scope_id}/${webhookToornament.object_type}s/${webhookToornament.object_id}`,
    {
      headers: {
        'X-Api-Key': toornamentCredentials.apiKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const discordIds = toornamentParticipants.data.lineup
    ? toornamentParticipants.data.lineup.map((player: PlayerToornament) => player.custom_fields.discord_id)
    : [toornamentParticipants.data.custom_fields.discord_id];
  return { team: toornamentParticipants.data.name, discordIds };
};

export default async (request: Request) => {
  const participants = await fetchParticipants(request.body);
  switch (request.body.name) {
    case 'participant.created':
      logger.debug(`ADD ${JSON.stringify(participants)}`);
      break;
    case 'registration.info_updated':
      logger.debug(`DELETE ${JSON.stringify(participants)}`);
      break;
    case 'participant.info_updated':
      logger.debug(`UPDATE ${JSON.stringify(participants)}`);
      break;
    default:
      break;
  }
};

const bot = new Discord.Client();
let server: Discord.Guild;

export const discordLogin = () =>
  new Promise((resolve) => {
    if (discordToken()) {
      bot.login(discordToken());
      bot.on('ready', async () => {
        logger.info('Bot ready');
        server = bot.guilds.cache.get(discordServer());

        resolve();
      });
    } else {
      logger.warn('Discord token not entered, you can still continue to dev !');
      resolve();
    }
  });

const getMemberByName = (id: string) =>
  server.members.cache.find((member) => id === `${member.user.username}#${member.user.discriminator}`);

const getChannelsByName = (name: string) => server.channels.cache.filter((channel) => channel.name === name);

const getRolesByName = (name: string) => server.roles.cache.filter((role) => role.name === name);

/**
 * Get the self bot role id it is equal at the bot name and never changes
 */
const getSelfRoleId = () => server.me.roles.cache.find((role) => role.name === server.me.displayName);

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

  // Remove special characters except french accents
  name = name.replace(/[^\s\w]àâäéèêëîïôöùûüÿçæœ_-/g, '');

  return name;
};

/**
 * Create a discord team with 2 channels and assign roles
 */
export const createTeam = async (team: string, discordIds: Array<string>, tournamentId: string) => {
  const tournament = await fetchTournament(tournamentId);

  const discordTeamName = getDiscordTeamName(team, tournamentId);

  const tournamentRole = server.roles.cache.get(tournament.discordRoleId);

  // Create role
  logger.debug(`Create role ${discordTeamName}`);
  const teamRole = await server.roles.create({
    data: {
      name: discordTeamName,
    },
  });

  // Check if all members are in discord
  discordIds.forEach((discordId) => {
    if (!getMemberByName(discordId)) {
      throw new Error('A person from the team you are trying to add is not in the server');
    }
  });

  // Assign role to all the users who has joined the server
  await Promise.all(
    discordIds
      .filter((discordId) => getMemberByName(discordId))
      .map((discordId) => {
        const member = getMemberByName(discordId);
        logger.debug(`Asign ${teamRole.name} role to ${discordId}`);

        return member.roles.add([teamRole, tournamentRole]);
      }),
  );

  // Create channels
  const channelTypes: Array<'text' | 'voice'> = ['text', 'voice'];

  // Allow the channel to be viewed only by the tournament staff and the team and the bot (to delete the channel)
  await Promise.all(
    channelTypes.map((channelType) => {
      logger.debug(`Create channel ${channelType}:${discordTeamName}`);

      return server.channels.create(discordTeamName, {
        type: channelType,
        parent: tournament.discordCategoryId,
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
          {
            id: getSelfRoleId(),
            allow: ['VIEW_CHANNEL'],
          },
        ],
      });
    }),
  );
};

export const deleteTeam = async (team: string, tournamentId: string) => {
  const discordTeamName = getDiscordTeamName(team, tournamentId);

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
