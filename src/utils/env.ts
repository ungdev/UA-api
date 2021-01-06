import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const throwOrWarn = (message: string) => {
  // We only use the litteral check because the env.development variable is not defined yet
  if (process.env.NODE_ENV === 'development') {
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
      throwOrWarn(`Variable ${currentKey} is not a number`);
    }
    // Checks, if the value is a string, that the length is not equals to 0
    if (typeof value === 'string' && value.length === 0) {
      throwOrWarn(`Variable ${currentKey} is empty`);
    }

    // If the variable is an object, checks below
    if (typeof value === 'object') {
      checkConfiguration(value, currentKey);
    }

    // And finally checks the value is not undefined
    if (value === undefined) {
      throwOrWarn(`Variable ${key} is undefined`);
    }
  }
};

const env = {
  development: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  testing: process.env.NODE_ENV === 'testing',
  api: {
    port: Number(process.env.API_PORT) || 3000,
    prefix: process.env.API_PREFIX || '/',
  },
  front: {
    website: process.env.ARENA_WEBSITE || 'https://arena.utt.fr',
  },
  bcrpyt: {
    level: Number(process.env.API_BCRYPT_LEVEL) || 11,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expires: process.env.JWT_EXPIRES,
  },
  slack: {
    token: process.env.SLACK_TOKEN,
    contactChannel: process.env.SLACK_CONTACT_CHANNEL,
  },
  database: {
    host: process.env.DATABASE_HOST,
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

checkConfiguration(env);

export default env;
