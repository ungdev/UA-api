/* eslint-disable consistent-return */
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

// Load dotenv only if we are not in testing
// The testing must be able to be loaded without any environment variable except the DATABASE
// We had to use a function to check if we are in testing environment instead of just loading dotenv if we are not
// The reason is because prisma also loads dotenv and injects the variables
const loadEnv = (key: string) => {
  // If we are in test env, do not inject dotenv variables
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  // Return the loaded environment key
  return process.env[key];
};

// Returns the key only if we are not in production
// Used when you want to have a default option for only testing and dev environment
// An example is to make sure you don't put fake credentials in a production environoemnt
export const notInProduction = <T = string>(key: T) => {
  if (process.env.NODE_ENV !== 'production') {
    return key;
  }
};

const loadIntEnv = (key: string) => Number(loadEnv(key));

const env = {
  development: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  test: process.env.NODE_ENV === 'test',
  api: {
    port: loadIntEnv('API_PORT') || 3000,
    prefix: loadEnv('API_PREFIX') || '/',
  },
  front: {
    website: loadEnv('API_WEBSITE') || 'https://arena.utt.fr',
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
    expires: loadEnv('NANOID_ALPHABET') || '1y',
  },
  slack: {
    token: loadEnv('SLACK_TOKEN'),
    contactChannel: loadEnv('SLACK_CONTACT_CHANNEL'),
  },
  database: {
    host: loadEnv('DATABASE_HOST') || 'localhost',
    port: loadIntEnv('DATABASE_PORT') || 3306,
    username: loadEnv('DATABASE_USERNAME') || notInProduction('test'),
    password: loadEnv('DATABASE_PASSWORD') || notInProduction('test'),
    name: loadEnv('DATABASE_NAME') || 'arena',
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
  etupay: {
    id: loadIntEnv('ETUPAY_ID') || notInProduction(1),
    // random key genereated with require('crypto').randomBytes(32).toString('base64')
    key: loadEnv('ETUPAY_KEY') || notInProduction('0Op1QauLn++f1ioyaBNQSJZrg4HCxkRt5c8KFFoGB54='),
    url: loadEnv('ETUPAY_KEY') || 'https://etupay.utt.fr/initiate',
    successUrl: loadEnv('ETUPAY_SUCCESS_URL') || 'https://arena.utt.fr/dashboard/payment?type=success',
    errorUrl: loadEnv('ETUPAY_ERROR_URL') || 'https://arena.utt.fr/dashboard/payment?type=error',
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
