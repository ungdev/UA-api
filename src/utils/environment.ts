import dotenv from 'dotenv';

dotenv.config();

// General
export const nodeEnv = (): string => process.env.NODE_ENV;
export const isDevelopment = (): boolean => nodeEnv() === 'development';
export const isProduction = (): boolean => nodeEnv() === 'production';
export const isTest = (): boolean => nodeEnv() === 'test';
export const apiPort = (): number => Number.parseInt(process.env.API_PORT);
export const apiPrefix = (): string => process.env.API_PREFIX || '/';
export const bcryptLevel = (): number => Number.parseInt(process.env.API_BCRYPT_LEVEL);
export const jwtSecret = (): string => process.env.JWT_SECRET;
export const jwtExpires = (): string => process.env.JWT_EXPIRES;

// Slack
export const slackToken = (): string => process.env.SLACK_TOKEN;
export const slackContactChannel = (): string => process.env.SLACK_CONTACT_CHANNEL;

// Sentry
export const sentryUrl = (): string => process.env.SENTRY_URL;

// Database
export const databaseHost = (): string => process.env.DATABASE_HOST;
export const databasePort = (): number => Number.parseInt(process.env.DATABASE_PORT);
export const databaseUsername = (): string => process.env.DATABASE_USERNAME;
export const databasePassword = (): string => process.env.DATABASE_PASSWORD;
export const databaseName = (): string => process.env.DATABASE_NAME;
export const isProductionDatabase = (): boolean => databaseHost() === 'mariadb-prod';

// Mail
export const arenaWebsite = (): string => process.env.ARENA_WEBSITE;
export const mailHost = (): string => process.env.MAIL_HOST;
export const mailPort = (): number => Number.parseInt(process.env.MAIL_PORT);
export const mailUser = (): string => process.env.MAIL_USER;
export const mailPassword = (): string => process.env.MAIL_PASSWORD;
export const mailSender = (): string => process.env.MAIL_SENDER;

// Redis
export const redisHost = (): string => process.env.REDIS_HOST;
export const redisPort = (): number => Number.parseInt(process.env.REDIS_PORT);
export const redisPassword = (): string => process.env.REDIS_PASSWORD;

// Partners mails
export const partnersMails = (): string => process.env.PARTNERS_MAILS;

// Etupay
export const etupayId = (): number => Number.parseInt(process.env.ETUPAY_ID);
export const etupayKey = (): string => process.env.ETUPAY_KEY;
export const etupayUrl = (): string => process.env.ETUPAY_URL;
export const etupaySuccessUrl = (): string => process.env.ETUPAY_SUCCESSURL;
export const etupayErrorUrl = (): string => process.env.ETUPAY_ERRORURL;

// Toornament
export const toornamentClientId = (): string => process.env.TOORNAMENT_CLIENT_ID;
export const toornamentClientSecret = (): string => process.env.TOORNAMENT_CLIENT_SECRET;
export const toornamentKey = (): string => process.env.TOORNAMENT_KEY;

// DataDog
export const datadogKey = (): string => process.env.DATADOG_KEY;
export const datadogProduction = (): string => process.env.DATADOG_PRODUCTION;
export const datadogDevelopment = (): string => process.env.DATADOG_DEVELOPMENT;

// Discord
export const discordToken = (): string => process.env.DISCORD_TOKEN;
export const discordServer = (): string => process.env.DISCORD_SERVER;
