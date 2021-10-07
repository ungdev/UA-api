import axios from 'axios';
import qs from 'qs';
import {
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
} from '../controllers/discord/discordApi';
import { User } from '../types';
import env from '../utils/env';
import { encrypt } from '../utils/helpers';
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

export const createDiscordChannel = async (requestBody: DiscordCreateChannelRequest) => {
  const response = await bot.post<DiscordChannel>(`guilds/${env.discord.server}/channels`, requestBody);

  return response.data;
};

/**
 * Create a discord role
 */
export const createDiscordRole = async (requestBody: DiscordCreateRoleRequest) => {
  const response = await bot.post<DiscordRole>(`guilds/${env.discord.server}/roles`, requestBody);

  return response.data;
};

let memberRoleUpdateRateLimit = 0;
/**
 * Sets the roles of the targeted discord user.
 * Previous user's roles MUST be provided along with the new roles (if you add some)
 * not to be removed from the user.
 * @param userId the id of the {@link DiscordGuildMember} to set the roles to
 * @param roles the roles to set to the discord user
 * @returns the updated guild member or false if the rate limit was reached
 */
export const setMemberRoles = async (userId: Snowflake, roles: Snowflake[]) => {
  if (memberRoleUpdateRateLimit) {
    // If we are rate limited, don't perform any operation on the discord api
    if (Date.now() / 1000 < memberRoleUpdateRateLimit) return false;
    memberRoleUpdateRateLimit = 0;
  }
  try {
    const response = await bot.patch<DiscordGuildMember>(`guilds/${env.discord.server}/members/${userId}`, {
      roles,
    });
    const {
      'X-RateLimit-Remaining': remain,
      'X-RateLimit-Reset': reset,
      'X-RateLimit-Limit': limit,
    } = response.headers;
    if (remain === 0 && limit && reset) {
      logger.warn(`Rate limit reached for GuildMember patch: ${remain}/${limit} requests remaining before reset`);
      memberRoleUpdateRateLimit = reset;
    }
    return response.data;
  } catch (error) {
    if (error.status === 429) {
      const { 'Retry-After': after } = error.headers;
      memberRoleUpdateRateLimit = Date.now() / 1000 + after;
      return false;
    }
    throw error;
  }
};

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
    members.push(...playerListChunk.data.sort((a, b) => -a.user.id.localeCompare(b.user.id)));
    chunkSize = playerListChunk.data.length;
  } while (chunkSize === 1000);
  return members;
};
