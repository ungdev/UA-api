// General
export const nodeEnv = (): string => process.env.NODE_ENV;
export const devEnv = (): boolean => nodeEnv() === 'development';
export const apiPort = (): number => parseInt(process.env.API_PORT);
export const bcryptLevel = (): number => parseInt(process.env.API_BCRYPT_LEVEL);
export const jwtSecret = (): string => process.env.JWT_SECRET;
export const jwtExpires = (): string => process.env.JWT_EXPIRES;
export const slackAlertWebhook = (): string => process.env.SLACK_ALERT_WEBHOOK;

// Database
export const dbHost = (): string => process.env.DB_HOST;
export const dbPort = (): number => parseInt(process.env.DB_PORT);
export const dbUsername = (): string => process.env.DB_USERNAME;
export const dbPassword = (): string => process.env.DB_PASSWORD;
export const dbName = (): string => process.env.DB_NAME;
export const dbProd = (): boolean => dbHost() === 'mariadb-prod';

// Mail
export const arenaWebsite = (): string => process.env.ARENA_WEBSITE;
export const mailUri = (): string => process.env.MAIL_URI;
export const mailSender = (): string => process.env.MAIL_SENDER;

// Redis
export const redisHost = (): string => process.env.REDIS_HOST;
export const redisPort = (): number => parseInt(process.env.REDIS_PORT);
export const redisPassword = (): string => process.env.REDIS_PASSWORD;

// Partners mails
export const partnersMails = (): string => process.env.PARTNERS_MAILS;

// Etupay
export const etupayId = (): number => parseInt(process.env.ETUPAY_ID);
export const etupayKey = (): string => process.env.ETUPAY_KEY;
export const etupayUrl = (): string => process.env.ETUPAY_URL;
export const etupaySuccessUrl = (): string => process.env.ETUPAY_SUCCESSURL;
export const etupayErrorUrl = (): string => process.env.ETUPAY_ERRORURL;

// Toornament
export const toornamentClientId = (): string => process.env.TOORNAMENT_CLIENT_ID;
export const toornamentClientSecret = (): string => process.env.TOORNAMENT_CLIENT_SECRET;
export const toornamentKey = (): string => process.env.TOORNAMENT_KEY;

// DataDog
export const ddKey = (): string => process.env.DD_KEY;
export const ddServiceProd = (): string => process.env.DD_SERVICE_PROD;
export const ddServiceDev = (): string => process.env.DD_SERVICE_DEV;
