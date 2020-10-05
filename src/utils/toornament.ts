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
 * Fetch tournaments from toornament
 * Works only with team tournemants and not solo tournaments
 * @param toornamentId
 */
export const fetchParticipantsDiscordIds = async (toornamentId: string) => {
  const toornamentParticipants: ToornamentParticipant[] = [];
  let cursor = 0;
  let totalTournaments = 0;

  do {
    logger.silly(`Fetch toornaments participants. Page: ${cursor / 50 + 1}`);
    const response = await axios.get<ToornamentParticipant[]>(
      `https://api.toornament.com/organizer/v2/tournaments/${toornamentId}/participants`,
      {
        headers: {
          'X-Api-Key': toornamentCredentials.apiKey,
          Range: `participants=${cursor}-${cursor + 49}`,
          Authorization: `Bearer ${toornamentCredentials.participantToken}`,
        },
      },
    );

    toornamentParticipants.push(...response.data);

    // Example of this header: participants 0-1/2
    // Capture the last number to get the total number of tournaments
    const contentRange: string = response.headers['content-range'];
    totalTournaments = Number(contentRange.match(/\d+$/)[0]);

    // You can only fetch tournaments 50 by 50
    cursor += 50;
  } while (cursor < totalTournaments);

  return toornamentParticipants.map((participant: ToornamentParticipant) => {
    if (!participant.lineup) {
      throw new Error(`${toornamentId} is a solo tournament and s incompatible with team discord ids`);
    }

    return {
      name: participant.name,
      discordIds: participant.lineup.map((player) => {
        if (!player.custom_fields || !player.custom_fields.discord) {
          throw new Error(`${participant.name} team has has a member without a discord id`);
        }
        return player.custom_fields.discord;
      }),
    };
  });
};
