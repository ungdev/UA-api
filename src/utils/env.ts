/* eslint-disable consistent-return */
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Load dotenv only if we are not in testing
// The testing must be able to be loaded without any environment variable except the DATABASE
// We had to use a function to check if we are in testing environment instead of just loading dotenv if we are not
// The reason is because prisma also loads dotenv and injects the variables
// We however allow some variables like database credentials in testing environment
const loadEnv = (key: string, allowedInTesting = false) => {
  // If we are in test env, do not inject dotenv variables
  if (process.env.NODE_ENV === 'test' && !allowedInTesting) {
    return;
  }
  // Return the loaded environment key
  return process.env[key];
};

const loadIntEnv = (key: string, allowedInTesting = false) => Number(loadEnv(key, allowedInTesting));

// Returns the key only if we are not in production
// Used when you want to have a default option for only testing and dev environment
// An example is to make sure you don't put fake credentials in a production environoemnt
export const notInProduction = <T = string>(key: T) => {
  if (process.env.NODE_ENV !== 'production') {
    return key;
  }
};

const env = {
  development: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  test: process.env.NODE_ENV === 'test',
  // Defines the environment used by sentry
  environment: (loadEnv('ENVIRONMENT') || notInProduction('development')) as 'development' | 'staging' | 'production',
  api: {
    port: loadIntEnv('API_PORT') || 3000,
    prefix: loadEnv('API_PREFIX') || '/',
    itemsPerPage: 50,
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
  email: {
    host: loadEnv('EMAIL_HOST') || 'localhost',
    port: loadIntEnv('EMAIL_PORT') || 2525, // We don't use the normal 25 port because of testing (25 listening is usually denied)
    user: loadEnv('EMAIL_USER'),
    password: loadEnv('EMAIL_PASSWORD'),
    sender: {
      name: loadEnv('EMAIL_SENDER_NAME') || 'UTT Arena',
      address: loadEnv('EMAIL_SENDER_ADDRESS') || 'arena@utt.fr',
    },
    subjects: {
      payment: loadEnv('EMAIL_SUBJECT_PAYMENT') || 'Reçu de votre paiement',
    },
    partners: ['utt.fr', 'utc.fr', 'utbm.fr'],
  },
  etupay: {
    id: loadIntEnv('ETUPAY_ID') || notInProduction(1),
    // random 256 bits key genereated if not in production
    key: loadEnv('ETUPAY_KEY') || notInProduction(crypto.randomBytes(32).toString('base64')),
    url: loadEnv('ETUPAY_KEY') || 'https://etupay.utt.fr/initiate',
    successUrl: loadEnv('ETUPAY_SUCCESS_URL') || 'https://arena.utt.fr/dashboard/payment?type=success',
    errorUrl: loadEnv('ETUPAY_ERROR_URL') || 'https://arena.utt.fr/dashboard/payment?type=error',
  },
  qrcode: {
    // random 128 bits key generated if not in production
    key: loadEnv('QRCODE_KEY') || notInProduction(crypto.randomBytes(16).toString('base64')),

    // The initial vector is global and not local to not having to store it in the QR Codes.
    // As we encrypt unique ids, it doesn't matter to have a static initial vector
    initialVector: loadEnv('QRCODE_IV') || notInProduction(crypto.randomBytes(16).toString('base64')),
  },
  toornament: {
    clientId: loadEnv('TOORNAMENT_CLIENT_ID'),
    clientSecret: loadEnv('TOORNAMENT_CLIENT_SECRET'),
    key: loadEnv('TOORNAMENT_KEY'),
  },
  discord: {
    token: loadEnv('DISCORD_TOKEN'),
    server: loadEnv('DISCORD_SERVER'),
  },
  log: {
    level: loadEnv('LOG_LEVEL') || 'silly',
    enabledInTest: loadEnv('LOG_IN_TEST', true) === 'true',
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
