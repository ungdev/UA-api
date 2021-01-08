import dotenv from 'dotenv';
import logger from './logger';

// Load dotenv only if we are not in testing
// The testing must be able to be loaded without any environment variable except the DATABASE
if (process.env.NODE_ENV !== 'testing') {
  dotenv.config();
}

const env = {
  development: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  test: process.env.NODE_ENV === 'test',
  api: {
    port: Number(process.env.API_PORT) || 3000,
    prefix: process.env.API_PREFIX || '/',
  },
  front: {
    website: process.env.ARENA_WEBSITE || 'https://arena.utt.fr',
  },
  bcrypt: {
    rounds: Number(process.env.API_BCRYPT_ROUNDS) || 10,
  },
  nanoid: {
    length: Number(process.env.NANOID_LENGTH) || 6,
    alphabet: process.env.NANOID_ALPHABET || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'randomLongString',
    expires: process.env.JWT_EXPIRES || '1y',
  },
  slack: {
    token: process.env.SLACK_TOKEN,
    contactChannel: process.env.SLACK_CONTACT_CHANNEL,
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number.parseInt(process.env.DATABASE_PORT) || 3306,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 25,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    sender: process.env.EMAIL_SENDER || 'UTT Arena<arena@utt.fr>',
  },
  partners: {
    emails: ['utt.fr', 'utc.fr', 'utbm.fr'],
  },
  etudpay: {
    id: Number(process.env.ETUPAY_ID),
    key: process.env.ETUPAY_KEY,
    url: process.env.ETUPAY_URL || 'https://etupay.utt.fr/initiate',
    successUrl: process.env.ETUPAY_SUCCESS_URL || 'https://arena.utt.fr/dashboard/payment?type=success',
    errorUrl: process.env.ETUPAY_ERROR_URL || 'https://arena.utt.fr/dashboard/payment?type=error',
  },
  toornament: {
    clientId: process.env.TOORNAMENT_CLIENT_ID,
    clientSecret: process.env.TOORNAMENT_CLIENT_SECRET,
    key: process.env.TOORNAMENT_KEY,
  },
  discord: {
    token: process.env.DISCORD_TOKEN,
    server: process.env.DISCORD_SERVER,
  },
};

const optionalVariables = ['email.user', 'email.password'];

const throwOrWarn = (key: string, reason: string) => {
  const message = `[${key}] ${reason}`;

  // We only use the litteral check because the env.development variable is not defined yet
  // Check if we are not in production or the variable is optional
  if (process.env.NODE_ENV !== 'production' || optionalVariables.includes(key)) {
    logger.warn(message);
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
