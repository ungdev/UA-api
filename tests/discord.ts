import axios from 'axios';
import nock from 'nock';
import { decode } from 'querystring';
import type {
  DiscordAuthorizationData,
  DiscordChannel,
  DiscordCreateChannelRequest,
  DiscordCreateRoleRequest,
  DiscordGuildMember,
  DiscordToken,
  DiscordTokenRequest,
  Snowflake,
} from '../src/controllers/discord/discordApi';
import env from '../src/utils/env';
import { generateFakeDiscordId } from './utils';

let members: DiscordGuildMember[] = [];
let roles: Snowflake[] = [];
let userOauthCode: { [code in string]: { allow: boolean; userId?: Snowflake } } = {};
let rateLimitRemainingRequests = 4;

/**
 * Adds a {@link DiscordGuildMember} to the fake debug discord server.
 *
 * The so-called "fake debug discord server" is a local representation of a discord server
 * using http interceptors to handle api requests. In order to add more features (ie. more
 * routes of the discord api, check the {@link listen} function below).
 * This local recipient can also enforce rate limits (using {@link computeRateLimitHeader}
 * with true as an argument) but won't block requests: the `x-ratelimit-reset-after` is always
 * equal to 0. As the reset-after header equals 0 by design, the fake api may respond with
 * `429 Too Many Requests` but the tests should immediately retry to execute the exact same
 * request (and there won't be a rate limit error).
 *
 * In order to use the fake discord api, you may want to register roles or guild members
 * without having to use existing requests (eg. `POST /guilds/{guildId}/roles` or
 * `PUT /guilds/{guildId}/members/{memberId}/roles/{roleId}`). In this case, you can use the
 * {@link registerMember} and {@link registerRole} functions. This functions have respective
 * opposites: {@link kickMember} and {@link deleteRole}.
 *
 * If your requests are not handled by internally, there are a few checks you can do:
 * - {@link enableFakeDiscordApi} must be called somewhere (much likely in `setup.js`)
 * - {@link disableFakeDiscordApi} must not have been called (or cancelled
 *   with {@link enableFakeDiscordApi})
 * - add the `DEBUG=nock.scope:discord.com` environment variable
 * - if roles are not properly set/unset, check {@link resetFakeDiscord} has been called after
 *   previous tests
 *
 * @param id the id of the {@link DiscordGuildMember} to register.
 * Can be null to generate it on the fly
 * @param memberRoles a list of the roles to add to the {@link DiscordGuildMember}.
 * This only for debug purposes (to check role removal)
 * @returns the id of the represented {@link DiscordGuildMember}
 */
export const registerMember = (id?: Snowflake, memberRoles: Snowflake[] = []): Snowflake => {
  const discordId = id ?? generateFakeDiscordId();
  members.push({
    avatar: '',
    deaf: false,
    is_pending: false,
    mute: false,
    pending: false,
    premium_since: '',
    roles: memberRoles,
    user: {
      id: discordId,
      username: '',
      avatar: '',
      discriminator: '',
      public_flags: 0,
    },
  });
  return discordId;
};

/**
 * Kicks a {@link DiscordGuildMember} from the local fake discord server.
 * @param memberId the id of the {@link DiscordGuildMember} to kick from the server
 * @returns whether a member was kicked
 * @see registerMember for more details about the fake discord api
 */
export const kickMember = (memberId: Snowflake) =>
  members.splice(
    members.findIndex((member) => member.user.id === memberId),
    1,
  ).length > 0;

/**
 * Registers a {@link DiscordTokenRequest.code} for future api requests. This is mandatory
 * not to get a 403 error from the fake discord api.
 * @param allowOAuth whether the oauth should be successful
 * @param id the id of the {@link DiscordGuildMember} the oauth is executed for
 * @returns the oauth code, as returned by a regular discord request. Check the
 * [Discord API Docs](https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-redirect-url-example)
 * for more information
 * @see registerMember for more details about the fake discord api
 */
export const registerOauthCode = (allowOAuth = false, id?: Snowflake) => {
  const discordOauthCode = Buffer.from(generateFakeDiscordId()).toString('base64');
  userOauthCode[discordOauthCode] = { allow: allowOAuth, userId: id ?? registerMember() };
  return discordOauthCode;
};

/**
 * Registers a {@link DiscordRole} in the fake discord server.
 * @param id the id of the role to register in the fake discord server. Can be omitted
 * to generate it on the fly.
 * @returns the id of the registered role
 * @see registerMember for more details about the fake discord api
 */
export const registerRole = (id?: Snowflake): Snowflake => {
  const roleId = id ?? generateFakeDiscordId();
  roles.push(roleId);
  return roleId;
};

/**
 * Unregisters/deletes a {@link DiscordRole} from the fake discord server.
 * @param id the id of the role to unregister
 * @returns whether a role was deleted
 * @see registerMember for more details about the fake discord api
 */
export const deleteRole = (id: Snowflake) => roles.splice(roles.indexOf(id), 1).length > 0;

/**
 * Creates headers for the fake discord api. This function also updates the
 * {@link rateLimitRemainingRequests} property. When setting {@link enforceRateLimit} to
 * true, the request should check (before calling this function) whether the
 * {@link rateLimitRemainingRequests} is strictly negative. In that case, it should
 * return a `429 Too Many Requests` http error.
 * @param enforceRateLimit whether the headers should stay stuck at 0 x-ratelimit-remaining (before reset)
 * @returns the header to use in the response
 */
const computeRateLimitHeader = (enforceRateLimit = false): nock.ReplyHeaders => {
  const remaining =
    rateLimitRemainingRequests < 0
      ? ((rateLimitRemainingRequests = 4) + 1) * <number>(<unknown>!enforceRateLimit)
      : rateLimitRemainingRequests--;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <any>{
    'X-RateLimit-Limit': 5,
    'X-RateLimit-Remaining': remaining,
    'X-Ratelimit-Reset-After': 0,
  };
};

/**
 * Adds interceptors to the axios adapter. This function is called by {@link enableFakeDiscordApi}
 * and enables/handles http requests to the 'fake discord api'.
 */
const listen = () => {
  // eslint-disable-next-line global-require
  axios.defaults.adapter = require('axios/lib/adapters/http');
  nock('https://discord.com/api/v9')
    .persist()

    // Get GuildMember https://discord.com/developers/docs/resources/guild#get-guild-member
    .get(/\/guilds\/\d+\/members\/\d+/)
    .reply((uri) => {
      if (rateLimitRemainingRequests < 0) return [429, null, computeRateLimitHeader(true)];
      const discordMemberId = uri.match(/\d+$/)[0];
      const discordMember = members.find((member) => member.user.id === discordMemberId);
      return [
        discordMember ? 200 : 404,
        discordMember ?? {
          code: 10007,
          message: 'Unknown member',
        },
        computeRateLimitHeader(),
      ];
    })

    // Remove GuildMember Role https://discord.com/developers/docs/resources/guild#remove-guild-member-role
    .delete(/\/guilds\/\d+\/members\/\d+\/roles\/\d+/)
    .reply((uri) => {
      if (rateLimitRemainingRequests < 0) return [429, null, computeRateLimitHeader(true)];
      const [, discordMemberId, discordRoleId] = /(\d+)\/[^/]*\/(\d+)$/.exec(uri);
      const discordMember = members.find((member) => member.user.id === discordMemberId);
      const roleExists = roles.includes(discordRoleId);
      if (roleExists) discordMember.roles.splice(discordMember.roles.indexOf(discordRoleId, 1));
      return [
        roleExists && discordMember ? 204 : 404,
        roleExists && discordMember
          ? null
          : {
              code: discordMember ? 10011 : 10007,
              message: discordMember ? 'Unknown role' : 'Unknown member',
            },
        computeRateLimitHeader(),
      ];
    })

    // Access token generation https://discord.com/developers/docs/topics/oauth2#authorization-code-grant
    .post('/oauth2/token')
    .reply((...[, body]) => {
      const { code } = decode(<string>body) as Record<keyof DiscordTokenRequest, string>;
      if (code in userOauthCode) {
        const authorized = userOauthCode[code];
        delete userOauthCode[code];
        return [
          200,
          <DiscordToken>{
            scope: 'identify',
            expires_in: Date.now() + 1000,
            access_token: registerOauthCode(authorized.allow, authorized.userId),
            refresh_token: 'BNAZHI282781Jhg276hHG2Gdvhno2==',
            token_type: 'Bearer',
          },
        ];
      }
      return [403, null];
    })

    // Authorization information https://discord.com/developers/docs/topics/oauth2#get-current-authorization-information
    .get('/oauth2/@me')
    // eslint-disable-next-line func-names
    .reply(function () {
      const token = this.req.headers.authorization.replace(/^Bearer\s+/, '');
      if (token in userOauthCode) {
        const authorized = userOauthCode[token];
        delete userOauthCode[token];
        return [
          200,
          <DiscordAuthorizationData>{
            scopes: ['identify'],
            expires: new Date(Date.now() + 1e4).toISOString(),
            user:
              authorized.allow === true
                ? {
                    id: authorized.userId,
                    username: 'Some random username!',
                    discriminator: '0000',
                    avatar: 'emptylink',
                    public_flags: 0,
                  }
                : undefined,
            application: {
              id: '1420070400000',
              name: 'UTT Arena',
              icon: 'emptylink',
              description: '',
              summary: '',
              hook: false,
              bot_public: false,
              bot_require_code_grant: false,
              verify_key: '',
            },
          },
        ];
      }
      return [403, null];
    })

    // Create Guild Role https://discord.com/developers/docs/resources/guild#create-guild-role
    .post(/\/guilds\/\d+\/roles/)
    .reply((_, body) => {
      const role = registerRole();
      return [
        201,
        {
          id: role,
          name: (<DiscordCreateRoleRequest>body).name,
          color: (<DiscordCreateRoleRequest>body).color,
        },
        computeRateLimitHeader(),
      ];
    })

    // Create Guild Channel https://discord.com/developers/docs/resources/guild#create-guild-channel
    .post(/\/guilds\/\d+\/channels/)
    .reply((_, body) => [
      201,
      <DiscordChannel>{
        ...(<DiscordCreateChannelRequest>body),
        id: generateFakeDiscordId(),
      },
      computeRateLimitHeader(),
    ])

    // List Guild Members https://discord.com/developers/docs/resources/guild#list-guild-members
    .get(/\/guilds\/\d+\/members/)
    .query(true)
    .reply(() => [200, members, computeRateLimitHeader()])

    // Add Guild Member Role https://discord.com/developers/docs/resources/guild#add-guild-member-role
    .put(/\/guilds\/\d+\/members\/\d+\/roles\/\d+/)
    .reply((uri) => {
      if (rateLimitRemainingRequests < 0) return [429, null, computeRateLimitHeader(true)];
      const [, discordMemberId, discordRoleId] = /(\d+)\/[^/]*\/(\d+)$/.exec(uri);
      const discordMember = members.find((member) => member.user.id === discordMemberId);
      const roleExists = roles.includes(discordRoleId);
      if (roleExists) discordMember.roles.push(discordRoleId);
      return [
        roleExists && discordMember ? 204 : 404,
        roleExists && discordMember
          ? null
          : {
              code: discordMember ? 10011 : 10007,
              message: discordMember ? 'Unknown role' : 'Unknown member',
            },
        computeRateLimitHeader(),
      ];
    });
};

/**
 * Resets the fake discord server. **It does not disable the fake discord api !**
 * Deletes all registered {@link DiscordGuildMember}, {@link DiscordRole} and
 * {@link DiscordTokenRequest.code} at once (previously registered using http
 * requests or {@link registerMember}, {@link registerRole} and {@link registerOauthCode}).
 * @see disableFakeDiscordApi to see how to disable the fake discord api
 * @see registerMember for more details about the fake discord api
 */
export const resetFakeDiscord = () => {
  members = [];
  roles = [];
  userOauthCode = {};
};

/**
 * Starts the 'fake discord api'. Generates a discord token and server id, stored
 * in `env.discord.token` and `env.discord.server` environment variables.
 * @see registerMember for more details about the fake discord api
 */
export const enableFakeDiscordApi = () => {
  env.discord.token = 'test-token';
  env.discord.server = generateFakeDiscordId();
  listen();
};

/**
 * Stops the 'fake discord api'. Removes all interceptors and clears environment variables.
 * This function does **not** call {@link resetFakeDiscord}. To clear data from the fake
 * discord server, use the function above.
 * @see registerMember for more details about the fake discord api
 */
export const disableFakeDiscordApi = () => {
  delete env.discord.token;
  delete env.discord.server;
  nock.cleanAll();
};
