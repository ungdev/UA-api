import dotenv from 'dotenv';

const { env } = process;

dotenv.config();

/**
 * Checks the configuration to not have any empty configuration variable.
 *
 * @private
 * @param {object} config - Configuration variable.
 */
const checkConfiguration = (config: object) => {
  // Foreach config key, checks if it has a non null value
  for (const [key, value] of Object.entries(config)) {
    // Checks if NaN if the value is a number
    if (typeof value === 'number' && Number.isNaN(value)) {
      throw new TypeError(`Variable ${key} is not a number`);
    }
    // Checks, if the value is a string, that the length is not equals to 0
    if (typeof value === 'string' && value.length === 0) {
      throw new TypeError(`Variable ${key} is empty`);
    }

    // If the variable is an object, checks below
    if (typeof value === 'object') {
      checkConfiguration(value);
    }

    // And finally checks the value is not undefined
    if (value === undefined) {
      throw new TypeError(`Variable ${key} is undefined`);
    }
  }
};

const environment = {
  api: {
    port: Number(env.API_PORT) || 3000,
    prefix: env.API_PREFIX || '/',
  },
  front: {
    website: env.ARENA_WEBSITE || 'https://arena.utt.fr',
  },
  environment: {
    development: env.NODE_ENV === 'development',
    production: env.NODE_ENV === 'production',
    testing: env.NODE_ENV === 'testing',
  },
  bcrpyt: {
    level: Number(env.API_BCRYPT_LEVEL) || 11,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expires: env.JWT_EXPIRES,
  },
  slack: {
    token: env.SLACK_TOKEN,
    contactChannel: env.SLACK_CONTACT_CHANNEL,
  },
  database: {
    host: env.DATABASE_HOST,
    port: Number.parseInt(process.env.DATABASE_PORT) || 3306,
    username: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
  },
  email: {
    host: env.EMAIL_HOST,
    port: Number(env.EMAIL_PORT) || 25,
    user: env.EMAIL_USER,
    password: env.EMAIL_PASSWORD,
    sender: env.EMAIL_SENDER || 'UTT Arena<arena@utt.fr>',
  },
  partners: {
    emails: ['utt.fr', 'utc.fr', 'utbm.fr'],
  },
  etudpay: {
    id: Number(env.ETUPAY_ID),
    key: env.ETUPAY_KEY,
    url: env.ETUPAY_URL,
    successUrl: env.ETUPAY_SUCCESS_URL,
    errorUrl: env.ETUPAY_ERROR_URL,
  },
  toornament: {
    clientId: env.TOORNAMENT_CLIENT_ID,
    clientSecret: env.TOORNAMENT_CLIENT_SECRET,
    key: env.TOORNAMENT_KEY,
  },
  discord: {
    token: env.DISCORD_TOKEN,
    server: env.DISCORD_SERVER,
  },
};

checkConfiguration(environment);

export default environment;
