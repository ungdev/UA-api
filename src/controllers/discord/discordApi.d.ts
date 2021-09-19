/* eslint-disable camelcase */

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

/**
 * Information about the current OAuth2 Authorization
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/oauth2#get-current-authorization-information-response-structure)}
 */
export declare interface DiscordAuthorizationData {
  readonly application: {
    readonly id: string;
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
  readonly user?: {
    readonly id: string;
    readonly username: string;
    readonly avatar: string;
    readonly discriminator: string;
    readonly public_flags: number;
  };
}

/**
 * Parameters of POST request to /api/{apiVersion}/oauth2/token to exchange
 * grant code with an access token (that can be used to login to gateway)
 * @see {@link [Discord Docs](https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-redirect-url-example)}
 */
export declare interface DiscordTokenRequest {
  readonly client_id: string;
  readonly client_secret: string;
  readonly code: string;
  readonly grant_type: 'authorization_code';
  readonly redirect_uri: `${'http' | 'https'}://${string}`;
}

export declare interface DiscordTokenRefreshRequest {
  readonly client_id: string;
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
  readonly client_id: string;
  readonly scope: Scope;
  readonly redirect_uri: RedirectURI;
  readonly state?: State;
  readonly prompt?: 'consent' | 'none';
}
