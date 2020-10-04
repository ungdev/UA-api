import axios from 'axios';
import qs from 'querystring';
import { ToornamentCredentials, ToornamentParticipant } from '../types';
import { toornamentClientId, toornamentClientSecret, toornamentKey } from './environment';
import logger from './log';

const clientCredentials = {
  grant_type: 'client_credentials',
  client_id: toornamentClientId(),
  client_secret: toornamentClientSecret(),
};

const toornamentTokenURL = 'https://api.toornament.com/oauth/v2/token';

export const toornamentCredentials: ToornamentCredentials = {
  participantToken: '',
  registrationToken: '',
  expirationDate: new Date(),
  apiKey: toornamentKey(),
};

export const toornamentInit = async () => {
  try {
    const responseParticipantToken = await axios.post(
      toornamentTokenURL,
      qs.stringify({ ...clientCredentials, scope: 'organizer:participant' }),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
    );
    const responseRegistrationToken = await axios.post(
      toornamentTokenURL,
      qs.stringify({ ...clientCredentials, scope: 'organizer:registration' }),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
    );
    const participantToken = responseParticipantToken.data.access_token;
    const registrationToken = responseRegistrationToken.data.access_token;
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    toornamentCredentials.participantToken = participantToken;
    toornamentCredentials.registrationToken = registrationToken;
    toornamentCredentials.expirationDate = expirationDate;
  } catch {
    logger.warn('Could not init toornament');
  }
};

/**
 * Fetch tournaments from
 * @param toornamentId
 */
export const fetchParticipants = async (toornamentId: string) => {
  const response = await axios.get<ToornamentParticipant[]>(
    `https://api.toornament.com/organizer/v2/tournaments/${toornamentId}/participants`,
    {
      headers: {
        'X-Api-Key': toornamentCredentials.apiKey,
        Range: 'participants=0-49',
        Authorization: `Bearer ${toornamentCredentials.participantToken}`,
      },
    },
  );

  return response.data.map((participant: ToornamentParticipant) => ({
    name: participant.name,
    discordIds: participant.lineup.map((player) => player.custom_fields.discord_id),
  }));
};
