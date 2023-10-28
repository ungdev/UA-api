/* eslint-disable consistent-return */
import crypto from 'crypto';
import dotenv, { DotenvPopulateInput } from 'dotenv';

if (process.env.NODE_ENV === 'test') {
  // Make sure to only load the 3 accepted variables in test
  const environmentVariables: DotenvPopulateInput = {};
  dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : undefined, processEnv: environmentVariables });
  process.env.DATABASE_URL = environmentVariables.DATABASE_URL;
  process.env.LOG_LEVEL = environmentVariables.LOG_LEVEL;
  process.env.LOG_IN_TEST = environmentVariables.LOG_IN_TEST;
} else {
  // Load everything in another environment
  dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : undefined });
}

const loadEnv = (key: string) => process.env[key];

const loadIntEnv = (key: string) => Number(loadEnv(key));

// Returns the key only if we are not in production
// Used when you want to have a default option for only testing and dev environment
// An example is to make sure you don't put fake credentials in a production environoemnt
export const notInProduction = <T = string>(key: T) => {
  if (process.env.NODE_ENV !== 'production') {
    return key;
  }
};

// Compute these values first to get the right environment variables
const frontEndpoint = loadEnv('ARENA_WEBSITE') || 'https://arena.utt.fr';
const apiEndpointPort = loadIntEnv('API_PORT') || undefined;
const apiEndpointPrefix = loadEnv('API_PREFIX') || '/';
const apiEndpoint = `${frontEndpoint.replace(/:\d+$/, `:${apiEndpointPort}`)}${apiEndpointPrefix}`;
const isTest = process.env.NODE_ENV === 'test';

const env = {
  development: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  test: isTest,
  // Defines the environment used by sentry
  environment: (loadEnv('ENVIRONMENT') || notInProduction('development')) as 'development' | 'staging' | 'production',
  api: {
    port: apiEndpointPort,
    prefix: apiEndpointPrefix,
    itemsPerPage: 50,
    cartLifespan: loadIntEnv('API_CART_LIFESPAN') || 36e5,
  },
  front: {
    website: frontEndpoint,
  },
  upload: {
    token: loadEnv('UPLOAD_FILE_TOKEN') || '1234azer',
  },
  bcrypt: {
    rounds: loadIntEnv('API_BCRYPT_ROUNDS') || 10,
  },
  nanoid: {
    length: loadIntEnv('NANOID_LENGTH') || 6,
    // We use an olphabet with only maj and numbers because the database comparison in database is case insensitive
    alphabet: loadEnv('NANOID_ALPHABET') || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  jwt: {
    secret: loadEnv('JWT_SECRET') || notInProduction('LongRandomKey'),
    expires: loadEnv('JWT_EXPIRES') || '1y',
  },
  slack: {
    token: loadEnv('SLACK_TOKEN'),
    contactChannel: loadEnv('SLACK_CONTACT_CHANNEL'),
  },
  email: {
    // We don't use the normal 25 port because of testing (25 listening is usually denied)
    // Also reject self signed certificates only in tests
    uri: loadEnv('SMTP_URI') || `smtp://localhost:2525/?pool=true&maxConnections=1&tls.rejectUnauthorized=${!isTest}`,
    sender: {
      name: loadEnv('EMAIL_SENDER_NAME') || 'UTT Arena',
      address: loadEnv('EMAIL_SENDER_ADDRESS') || 'arena@utt.fr',
    },
    partners: ['utt.fr', 'utc.fr', 'utbm.fr'],
  },
  etupay: {
    id: loadIntEnv('ETUPAY_ID') || notInProduction(1),
    // random 256 bits key genereated if not in production
    key: loadEnv('ETUPAY_KEY') || notInProduction(crypto.randomBytes(32).toString('base64')),
    url: loadEnv('ETUPAY_URL') || 'https://etupay.utt.fr/initiate',
    successUrl: loadEnv('ETUPAY_SUCCESS_URL') || `${frontEndpoint}/dashboard/payment?type=success`,
    errorUrl: loadEnv('ETUPAY_ERROR_URL') || `${frontEndpoint}/dashboard/payment?type=error`,
  },
  crypto: {
    // random 128 bits key generated if not in production
    key: loadEnv('CRYPTO_KEY') || notInProduction(crypto.randomBytes(16).toString('base64')),

    // The initial vector is global and not local to not having to store it in the QR Codes.
    // As we encrypt unique ids, it doesn't matter to have a static initial vector
    initialVector: loadEnv('CRYPTO_IV') || notInProduction(crypto.randomBytes(16).toString('base64')),
  },
  toornament: {
    clientId: loadEnv('TOORNAMENT_CLIENT_ID'),
    clientSecret: loadEnv('TOORNAMENT_CLIENT_SECRET'),
    key: loadEnv('TOORNAMENT_KEY'),
  },
  discord: {
    client: loadEnv('DISCORD_CLIENT'),
    secret: loadEnv('DISCORD_SECRET'),
    token: loadEnv('DISCORD_TOKEN'),
    server: loadEnv('DISCORD_SERVER'),
    apiUrl: loadEnv('DISCORD_OAUTH_URL') || 'https://discord.com/api/v9',
    apiTimeout: Number.parseInt(loadEnv('DISCORD_API_TIMEOUT')) || 5000,
    syncKey: loadEnv('DISCORD_SYNC_KEY') || notInProduction(crypto.randomBytes(16).toString('base64')),
    teamRoleColor: Number.parseInt(loadEnv('DISCORD_TEAM_ROLE_COLOR')) || 0x3498db,
    oauthCallback: `${apiEndpoint}${apiEndpointPrefix === '/' ? '' : '/'}discord/oauth`,
    webhooks: {
      channel_lol: process.env.DISCORD_WEBHOOK_TOURNAMENT_LOL,
      channel_ssbu: process.env.DISCORD_WEBHOOK_TOURNAMENT_SSBU,
      channel_cs2: process.env.DISCORD_WEBHOOK_TOURNAMENT_CS2,
      channel_pokemon: process.env.DISCORD_WEBHOOK_TOURNAMENT_POKEMON,
      channel_rl: process.env.DISCORD_WEBHOOK_TOURNAMENT_RL,
      channel_osu: process.env.DISCORD_WEBHOOK_TOURNAMENT_OSU,
      channel_tft: process.env.DISCORD_WEBHOOK_TOURNAMENT_TFT,
      channel_open: process.env.DISCORD_WEBHOOK_TOURNAMENT_OPEN,
      channel_other: process.env.DISCORD_WEBHOOK_TOURNAMENT_OTHER,
      contact: process.env.DISCORD_WEBHOOK_CONTACT,
    },
  },
  log: {
    level: loadEnv('LOG_LEVEL') || 'silly',
    // Colorize by default unless explicied false
    colorize: loadEnv('LOG_COLORIZE') !== 'false',
    enabledInTest: loadEnv('LOG_IN_TEST') === 'true',
    sentryDsn: loadEnv('LOG_SENTRY_DSN'),
  },
};

// Create a warn log array to use it after winsotn initialization
// We can't import Winsotn as there would be a circular dependency because winston depends of this file
export const warnLogs: string[] = [];

const optionalVariables = ['email.user', 'email.password'];

const throwOrWarn = (key: string, reason: string) => {
  const message = `[${key}] ${reason}`;

  // We only use the litteral check because the env.development variable is not defined yet
  // Check if we are not in production or the variable is optional
  if (process.env.NODE_ENV !== 'production' || optionalVariables.includes(key)) {
    // Push the warn log to the array
    warnLogs.push(message);
  } else {
    throw new TypeError(message);
  }
};

/**
 * Checks the configuration to not have any empty configuration variable.
 *
 * @private
 * @param {object} config - Configuration variable.
 */
const checkConfiguration = (config: object, parentKey = 'env') => {
  // Foreach config key, checks if it has a non null value
  for (const [key, value] of Object.entries(config)) {
    // Defines the key that will be displayed in case of an error
    const currentKey = `${parentKey}.${key}`;

    // Checks if NaN if the value is a number
    if (typeof value === 'number' && Number.isNaN(value)) {
      throwOrWarn(currentKey, 'The variable is not a number');
    }
    // Checks, if the value is a string, that the length is not equals to 0
    if (typeof value === 'string' && value.length === 0) {
      throwOrWarn(currentKey, 'The variable is empty');
    }

    // If the variable is an object, checks below
    if (typeof value === 'object') {
      checkConfiguration(value, currentKey);
    }

    // And finally checks the value is not undefined
    if (value === undefined) {
      throwOrWarn(currentKey, 'The variable is undefined');
    }
  }
};

checkConfiguration(env);

export default env;
