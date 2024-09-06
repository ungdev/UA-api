/**
 * Make an alias of snowflake to string to be more precise on the expected type
 */
export type Snowflake = string;

export declare type Scope =
  | `activities.${'read' | 'write'}`
  | `applications.${`builds.${'read' | 'upload'}` | `commands${'' | '.update'}` | 'entitlements' | 'store.update'}`
  | 'bot'
  | 'connections'
  | 'email'
  | 'gdm.join'
  | `guilds${'' | '.join'}`
  | 'identify'
  | 'messages.read'
  | 'relationships.read'
  | `rpc${'' | '.activities.write' | '.notifications.read' | `.voice.${'read' | 'write'}`}`
  | 'webhook.incoming';

export declare type RedirectURI = `${'http' | 'https'}://${string}`;

export declare interface DiscordUser {
  readonly id: Snowflake;
  readonly username: string;
  readonly avatar: string;
  readonly discriminator: string;
  readonly public_flags: number;
  readonly bot?: true;
}

/**
 * Information about the current OAuth2 Authorization
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/oauth2#get-current-authorization-information-response-structure)}
 */
export declare interface DiscordAuthorizationData {
  readonly application: {
    readonly id: Snowflake;
    readonly name: string;
    readonly icon: string;
    readonly description: string;
    readonly summary: string;
    readonly hook: boolean;
    readonly bot_public: boolean;
    readonly bot_require_code_grant: boolean;
    readonly verify_key: string;
  };
  readonly scopes: string[];
  readonly expires: string;
  readonly user?: DiscordUser;
}

/**
 * Parameters of POST request to /api/{apiVersion}/oauth2/token to exchange
 * grant code with an access token (that can be used to login to gateway)
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-redirect-url-example)}
 */
export declare interface DiscordTokenRequest {
  readonly client_id: Snowflake;
  readonly client_secret: string;
  readonly code: string;
  readonly grant_type: 'authorization_code';
  readonly redirect_uri: `${'http' | 'https'}://${string}`;
}

export declare interface DiscordTokenRefreshRequest {
  readonly client_id: Snowflake;
  readonly client_secret: string;
  readonly grant_type: 'refresh_token';
  readonly refresh_token: string;
}

/**
 * Token as sent by discord OAuth endpoint
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response)}
 */
export declare interface DiscordToken {
  readonly scope: Scope;
  readonly token_type: 'Bearer';
  readonly access_token: string;
  readonly expires_in: number;
  readonly refresh_token: string;
}

/**
 * Response of the oauth2/authorize request
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-redirect-url-example)}
 */
export declare interface DiscordAuthorizationSuccess<State = string> {
  readonly code: string;
  readonly state: State;
}

/**
 * Errors returned by the oauth2/authorize request
 */
export declare interface DiscordAuthorizationError {
  readonly error: string;
  readonly error_description: string;
}

export declare type DiscordAuthorization = Partial<DiscordAuthorizationSuccess> & Partial<DiscordAuthorizationError>;

/**
 * Request params for /api/{apiVersion}/oauth2/authorize
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-authorization-url-example)}
 */
export declare interface DiscordAuthorizationRequest<State = string> {
  readonly response_type: 'code';
  readonly client_id: Snowflake;
  readonly scope: Scope;
  readonly redirect_uri: RedirectURI;
  readonly state?: State;
  readonly prompt?: 'consent' | 'none';
}

/**
 * Interface for a channel type
 * @see {@link [Discord Docs](https://discord.com/developers/docs/resources/channel#channel-object-channel-types)}
 */
export declare const enum DiscordChannelType {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_NEWS = 5,
  GUILD_STORE = 6,
  GUILD_NEWS_THREAD = 10,
  GUILD_PUBLIC_THREAD = 11,
  GUILD_PRIVATE_THREAD = 12,
  GUILD_STAGE_VOICE = 13,
}

export declare const enum DiscordChannelPermissionType {
  ROLE = 0,
  MEMBER = 1,
}

/**
 * Enum to list all permissions (incomplete)
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags)}
 */
export declare const enum DiscordChannelPermission {
  DEFAULT = '0',
  VIEW_CHANNEL = '1024',
}

/**
 * Interface for a channel permission
 * @see {@link [Discord Docs](https://discord.com/developers/docs/resources/channel#overwrite-object)}
 */
export declare interface DiscordChannelPermissionOverwrite {
  readonly id: Snowflake;
  readonly type: DiscordChannelPermissionType;
  readonly allow: DiscordChannelPermission;
  readonly deny: DiscordChannelPermission;
}

/**
 * Interface for a channel request
 * @see {@link [Discord Docs](https://discord.com/developers/docs/resources/guild#create-guild-channel)}
 */
export declare interface DiscordCreateChannelRequest {
  readonly name: string;
  readonly type: DiscordChannelType;
  readonly topic?: string;
  readonly bitrate?: number;
  readonly user_limit?: number;
  readonly rate_limit_per_user?: number;
  readonly position?: number;
  readonly parent_id?: Snowflake;
  readonly permission_overwrites?: DiscordChannelPermissionOverwrite[];
  readonly nsfw?: boolean;
}

/**
 * Interface for a channel (used in channel responses), (not complete)
 * @see {@link [Discord Docs](https://discord.com/developers/docs/resources/channel#channel-object)}
 */
export declare interface DiscordChannel {
  readonly id: Snowflake;
  readonly type: DiscordChannelType;
  readonly guild_id?: Snowflake;
  readonly position?: number;
  readonly permission_overwrites?: DiscordChannelPermissionOverwrite[];
  readonly name?: string;
  readonly topic?: string;
  readonly nsfw?: boolean;
  readonly last_message_id?: Snowflake;
  readonly bitrate?: number;
  readonly user_limit?: number;
  readonly rate_limit_per_user?: number;
  readonly icon?: string;
  readonly owner_id?: Snowflake;
  readonly application_id?: Snowflake;
  readonly parent_id?: Snowflake;
  readonly rtc_region?: string;
  readonly video_quality_mode?: number;
  readonly message_count?: number;
  readonly member_count?: number;
  readonly default_auto_archive_duration?: number;
  readonly permissions?: string;
}

/**
 * Request body to create a role (not complete)
 * @see {@link [Discord Docs](https://discord.com/developers/docs/resources/guild#create-guild-role)}
 */
export declare interface DiscordCreateRoleRequest {
  readonly name: string;
  readonly color: number;
}

/**
 * Interface for a role (used in role responses), (not complete)
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/permissions#role-object)}
 */
export declare interface DiscordRole {
  readonly id: Snowflake;
  readonly name: string;
  readonly color: number;
}

/**
 * Interface for a member (used in member responses), (not complete)
 * @see {@link [Discord Docs](https://discord.com/developers/docs/resources/guild#guild-member-object)}
 */
export declare interface DiscordMember {
  readonly nick?: string;
}

export declare interface DiscordGuildMember extends DiscordMember {
  readonly user: DiscordUser;
  readonly roles: Snowflake[];
  readonly avatar: string | null;
  readonly premium_since: string | null;
  readonly is_pending: boolean;
  readonly pending: boolean;
  readonly mute: boolean;
  readonly deaf: boolean;
}

export declare interface DiscordEmbedFooter {
  readonly text: string;
  readonly icon_url?: string;
}

export declare interface DiscordEmbedField {
  readonly name: string;
  readonly value: string;
}

export declare interface DiscordEmbed {
  readonly title?: string;
  readonly description?: string;
  readonly color?: number;
  readonly footer?: DiscordEmbedFooter;
  readonly fields?: DiscordEmbedField[];
}
