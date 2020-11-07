import axios from 'axios';
import qs from 'querystring';
import { ToornamentParticipant } from '../types';
import { toornamentClientId, toornamentClientSecret, toornamentKey } from './environment';
import logger from './log';

// Toornament API axios instance
const toornamentAPI = axios.create({
  baseURL: 'https://api.toornament.com/organizer/v2',
  timeout: 10000,
});

/**
 * Get an access token from toornament by authenticating.
 * Required for other operations with toornament API.
 */
export const init = async () => {
  try {
    const response = await axios.post(
      'https://api.toornament.com/oauth/v2/token',
      qs.stringify({
        grant_type: 'client_credentials',
        client_id: toornamentClientId(),
        client_secret: toornamentClientSecret(),
        scope: 'organizer:participant',
      }),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
    );

    // Set headers
    toornamentAPI.defaults.headers = {
      Authorization: `Bearer ${response.data.access_token}`,
      'X-Api-Key': toornamentKey(),
    };
  } catch {
    logger.warn('Could not init toornament');
  }
};

/**
 * Try to retrieve real Discord id from what user gave by removing impossible cases
 * @param discordId User discordId input
 */
const normalizeDiscordId = (discordId: string) => discordId.trim().replace(/ +#/, '#');

/**
 * Fetch tournament participants from toornament id
 * @param toornamentId
 */
export const fetchParticipants = async (toornamentId: string, tournamentId: string) => {
  const toornamentParticipants: ToornamentParticipant[] = [];
  let cursor = 0;
  let totalParticipants;

  // You can only fetch participants 50 by 50
  do {
    logger.info(`[Toornament][${tournamentId}] Fetching participants... (page: ${cursor / 50 + 1})`);
    const response = await toornamentAPI.get<ToornamentParticipant[]>(`/tournaments/${toornamentId}/participants`, {
      headers: {
        Range: `participants=${cursor}-${cursor + 49}`,
      },
    });

    toornamentParticipants.push(...response.data);

    // Example of this header: participants 0-1/2
    // Capture the last number to get the total number of tournaments
    const contentRange: string = response.headers['content-range'];
    totalParticipants = Number(contentRange.match(/\d+$/)[0]);

    cursor += 50;
  } while (cursor < totalParticipants);

  // Return result with discord ids
  return toornamentParticipants.map((participant: ToornamentParticipant) => {
    // Solo tournament case (no lineup)
    if (!participant.lineup) {
      if (!participant.custom_fields || !participant.custom_fields.discord) {
        logger.warn(`[Toornament][${tournamentId}] ${participant.name} don't have a discord id`);
        return { name: participant.name, discordIds: [] };
      }

      return {
        name: participant.name,
        discordIds: [normalizeDiscordId(participant.custom_fields.discord)],
      };
    }

    // Team tournament case (with lineup)
    participant.lineup
      .filter((player) => !player.custom_fields || !player.custom_fields.discord)
      .forEach(() =>
        logger.warn(`[Toornament][${tournamentId}] ${participant.name} team has a member without a discord id`),
      );

    return {
      name: participant.name,
      discordIds: participant.lineup
        .filter((player) => player.custom_fields && player.custom_fields.discord)
        .map((player) => normalizeDiscordId(player.custom_fields.discord)),
    };
  });
};
