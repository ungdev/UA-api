import { Request } from 'express';
import axios from 'axios';
import { toornamentCredentials } from './toornament';
import { PlayerToornament, WebhookToornament } from '../types';
import logger from './log';

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
