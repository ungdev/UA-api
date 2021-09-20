import axios from 'axios';
import qs from 'qs';
import {
  DiscordAuthorizationData,
  DiscordAuthorizationRequest,
  DiscordToken,
  DiscordTokenRequest,
} from '../controllers/discord/discordApi';
import { User } from '../types';
import env from '../utils/env';
import { encrypt } from '../utils/helpers';

// baseURL is not set in this instance because it may contain
// bugs with getUri (https://github.com/axios/axios/issues/2468)
const discordFetcher = axios.create({
  timeout: env.discord.apiTimeout,
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
      url: `${env.discord.oauthUrl}/authorize`,
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
    `${env.discord.oauthUrl}/token`,
    qs.stringify(<DiscordTokenRequest>{
      client_id: env.discord.client,
      client_secret: env.discord.token,
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
  const userRequest = await discordFetcher.get<DiscordAuthorizationData>(`${env.discord.oauthUrl}/@me`, {
    headers: {
      // Authenticate to discord api with Bearer user token
      Authorization: `Bearer ${discordApiToken.access_token}`,
    },
  });
  return userRequest.data.user;
};