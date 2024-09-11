import axios, { AxiosError, AxiosResponse } from 'axios';
import qs from 'qs';
import type {
  DiscordAuthorizationData,
  DiscordAuthorizationRequest,
  DiscordToken,
  DiscordTokenRequest,
  DiscordCreateChannelRequest,
  DiscordChannel,
  DiscordCreateRoleRequest,
  DiscordRole,
  Snowflake,
  DiscordGuildMember,
  DiscordEmbed,
} from '../controllers/discord/discordApi';
import { User } from '../types';
import env from '../utils/env';
import { encrypt, sleep } from '../utils/helpers';
import logger from '../utils/logger';

// baseURL is not set in this instance because it may contain
// bugs with getUri (https://github.com/axios/axios/issues/2468)
const discordFetcher = axios.create({
  timeout: env.discord.apiTimeout,
});

// Create an instance used with the bot token
const bot = axios.create({
  timeout: env.discord.apiTimeout,
  baseURL: env.discord.apiUrl,
  headers: {
    Authorization: `Bot ${env.discord.token}`,
    'Content-Type': 'application/json',
    'User-Agent': `DiscordBot (https://github.com/ungdev/UA-api, 1.0.1)`,
  },
});

/**
 * Generates the discord oauth link of a specified user
 * @param user the user to generate the link for
 * @returns a formatted discord oauth link
 */
export const generateUserOAuthLink = (user: User) =>
  discordFetcher
    .getUri({
      method: 'GET',
      url: `${env.discord.apiUrl}/oauth2/authorize`,
      params: <DiscordAuthorizationRequest>{
        client_id: env.discord.client,
        redirect_uri: env.discord.oauthCallback,
        response_type: 'code',
        scope: 'identify',
        state: encrypt(user.id).toString('base64'),
      },
    })
    // axios does not turn ':' into '%3A' as {@link encodeURIComponent} would do
    .replace(/(redirect_uri=https?):/isu, '$1%3A');

/**
 * Exchanges an authorization_code (returned by oauth2) for a user access token
 * Request params are detailed in [Discord docs](
 * https://discord.com/developers/docs/topics/oauth2#authorization-code-grant).
 * @param grantCode the authorization_code returned by discord
 * @returns a (valid) token which can be used to access the api using the user scope
 */
export const getToken = async (grantCode: string) => {
  const discordApiResponse = await discordFetcher.post<DiscordToken>(
    `${env.discord.apiUrl}/oauth2/token`,
    qs.stringify(<DiscordTokenRequest>{
      client_id: env.discord.client,
      client_secret: env.discord.secret,
      code: grantCode,
      grant_type: 'authorization_code',
      redirect_uri: env.discord.oauthCallback,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  return discordApiResponse.data;
};

/**
 * Fetches the identification data of a discord account, using a {@link DiscordToken}
 * This identification data includes (at least) the fields specified in the [Discord docs](
 * https://discord.com/developers/docs/topics/oauth2#get-current-authorization-information).
 * @param discordApiToken the {@link DiscordToken} to authenficate the request with
 * @returns the discord account identification data (id, username, avatar, discriminator, public flags)
 * of the user authentified with the {@link discordApiToken}. If the user has not granted the 'identify'
 * permission, this function will return `null`.
 * @remarks
 * At that point, all authorizations must already have been granted (access code exchanged for
 * a user token). The (ua) api will query data to the (discord) api with a (by default) 5s timeout
 * and throw an error if no response was received during that delay.
 */
export const fetchDiscordUser = async (discordApiToken: DiscordToken) => {
  const userRequest = await discordFetcher.get<DiscordAuthorizationData>(`${env.discord.apiUrl}/oauth2/@me`, {
    headers: {
      // Authenticate to discord api with Bearer user token
      Authorization: `Bearer ${discordApiToken.access_token}`,
    },
  });
  return userRequest.data.user;
};

export const rateLimitedRequest = async <T>(handler: () => Promise<AxiosResponse<T>>): Promise<T> => {
  try {
    const response = await handler();
    if (Number(response.headers['x-ratelimit-remaining']) <= 2) {
      const resetAfter = Number(response.headers['x-ratelimit-reset-after']);
      logger.warn(`Wait ${resetAfter} seconds to avoid rate limit (success)`);
      await sleep(resetAfter);
    }
    return response.data;
  } catch (error) {
    if ((<AxiosError>error).response?.status === 429) {
      const resetAfter = Number(error.response.headers['x-ratelimit-reset-after']);
      logger.warn(`Wait ${resetAfter} seconds to avoid rate limit (retry)`);
      await sleep(resetAfter);
      return rateLimitedRequest(handler);
    }
    throw error;
  }
};

export const createDiscordChannel = (requestBody: DiscordCreateChannelRequest) =>
  rateLimitedRequest(() => bot.post<DiscordChannel>(`guilds/${env.discord.server}/channels`, requestBody));

export const deleteDiscordChannel = (channelId: string) =>
  rateLimitedRequest(() => bot.delete<DiscordChannel>(`channels/${channelId}`));

export const deleteDiscordRole = (roleId: string) =>
  rateLimitedRequest<Record<string, never>>(() => bot.delete(`guilds/${env.discord.server}/roles/${roleId}`));

/**
 * Create a discord role
 */
export const createDiscordRole = (requestBody: DiscordCreateRoleRequest) =>
  rateLimitedRequest<DiscordRole>(() => bot.post<DiscordRole>(`guilds/${env.discord.server}/roles`, requestBody));

/**
 * Fetches a single {@link DiscordGuildMember}. Checks if the next request is about to be rate limited,
 * in this case, sleep before ending function
 * @param userId the id of the {@link DiscordGuildMember} to fetch
 * @returns a promise resolving to the fetched {@link DiscordGuildMember}
 */
export const fetchGuildMember = (userId: Snowflake) =>
  rateLimitedRequest<DiscordGuildMember>(() => bot.get(`guilds/${env.discord.server}/members/${userId}`));

/**
 * Add a role to a discord guild member. Checks if the next request is about to be rate limited,
 * in this case, sleep before ending function
 * @param userId the id of the {@link DiscordGuildMember} to add the role to
 * @param role the role to add to the discord user
 */
export const addMemberRole = (userId: Snowflake, role: Snowflake) =>
  rateLimitedRequest<void>(() => bot.put(`guilds/${env.discord.server}/members/${userId}/roles/${role}`));

/**
 * Removes a role from a discord guild member. Checks if the next request is about to be rate limited,
 * in this case, sleep before ending function
 * @param userId the id of the {@link DiscordGuildMember} to remove the role from
 * @param role the role to remove from the discord user
 */
export const removeMemberRole = (userId: Snowflake, role: Snowflake) =>
  rateLimitedRequest<void>(() => bot.delete(`guilds/${env.discord.server}/members/${userId}/roles/${role}`));

/**
 * Fetches all of the {@link DiscordGuildMember} connected to the server.
 * During this process, the api downloads the entire guild member list from discord.
 *
 * Note: the member list doesn't contain partials at that time. This means that
 * retrieved data includes roles and user data
 * @requires GUILD_MEMBERS privileged intent enabled on the application
 * @returns the list of all guild members (ie. discord user in the server)
 */
export const fetchGuildMembers = async () => {
  const members: DiscordGuildMember[] = [];
  let chunkSize;
  do {
    const playerListChunk = await bot.get<DiscordGuildMember[]>(`guilds/${env.discord.server}/members`, {
      params: {
        limit: 1000,
        after: members[0]?.user?.id ?? 0,
      },
    });
    members.unshift(...playerListChunk.data.sort((a, b) => -a.user.id.localeCompare(b.user.id)));
    chunkSize = playerListChunk.data.length;
  } while (chunkSize === 1000);
  return members;
};

export const callWebhook = async (webhook: string, embeds: DiscordEmbed[]) => {
  const data = JSON.stringify({ embeds });
  try {
    // Send request
    await axios.post(webhook, data, { headers: { 'Content-Type': 'application/json' } });
  } catch {
    logger.warn(
      `An error occurred while sending a message on a webhook discord (${webhook}). What was tried to be sent : ${data}`,
    );
  }
};
