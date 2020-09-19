// General
export const nodeEnv = (): string => process.env.NODE_ENV;
export const isDevelopment = (): boolean => nodeEnv() === 'development';
export const isProduction = (): boolean => nodeEnv() === 'production';
export const apiPort = (): number => Number.parseInt(process.env.API_PORT);
export const bcryptLevel = (): number => Number.parseInt(process.env.API_BCRYPT_LEVEL);
export const jwtSecret = (): string => process.env.JWT_SECRET;
export const jwtExpires = (): string => process.env.JWT_EXPIRES;
export const slackAlertWebhook = (): string => process.env.SLACK_ALERT_WEBHOOK;

// Database
export const databaseHost = (): string => process.env.DATABASE_HOST;
export const isProductionDatabase = (): boolean => databaseHost() === 'mariadb-prod';

// Mail
export const arenaWebsite = (): string => process.env.ARENA_WEBSITE;
export const mailUri = (): string => process.env.MAIL_URI;
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
