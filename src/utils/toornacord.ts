import Discord from 'discord.js';
import { Request } from 'express';
import axios from 'axios';
import { toornamentCredentials } from './toornament';
import { PlayerToornament, WebhookToornament } from '../types';
import logger from './log';
import { fetchTournament } from '../operations/tournament';
import { discordServer, discordToken } from './environment';

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

if (discordToken()) {
  bot.login(discordToken());
  bot.on('ready', () => logger.info('Bot ready'));

  server = bot.guilds.cache.get(discordServer());
} else {
  logger.warn('Discord token not entered, you can still continue to dev !');
}

const getMember = (id: string) => {
  return server.members.cache.find((member) => id === `${member.user.username}#${member.user.discriminator}`);
};

/**
 * Create a discord team with 2 channels and assign roles
 */
export const createTeam = async (team: string, discordIds: Array<string>, tournamentId: string) => {
  const tournament = await fetchTournament(tournamentId);

  const discordName = `${tournamentId}_${team}`;

  const tournamentRole = server.roles.cache.get(tournament.discordRoleId);

  // Create role
  const teamRole = await server.roles.create({
    data: {
      name: discordName,
    },
  });

  // Assign role to all the users
  await Promise.all(
    discordIds.map((discordId) => {
      const member = getMember(discordId);
      return member.roles.add([teamRole, tournamentRole]);
    }),
  );

  // Create channels
  const channelTypes: Array<'text' | 'voice'> = ['text', 'voice'];

  await Promise.all(
    channelTypes.map((channelType) =>
      server.channels.create(discordName, {
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
        ],
      }),
    ),
  );
};
