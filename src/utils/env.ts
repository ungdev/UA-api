// General
export const nodeEnv = () => process.env.NODE_ENV;
export const devEnv = () => nodeEnv() === 'development';
export const jwtSecret = () => process.env.JWT_SECRET;
export const jwtExpires = () => process.env.JWT_EXPIRES;
export const apiPort = () => parseInt(process.env.API_PORT);
export const slackAlertWebhook = () => process.env.SLACK_ALERT_WEBHOOK;

// Database
export const dbHost = () => process.env.DB_HOST;
export const dbPort = () => parseInt(process.env.DB_PORT);
export const dbName = () => process.env.DB_NAME;
export const dbUsername = () => process.env.DB_USERNAME;
export const dbPassword = () => process.env.DB_PASSWORD;

// Etupay
export const etupayId = () => parseInt(process.env.ETUPAY_ID);
export const etupayKey = () => process.env.ETUPAY_KEY;
export const etupayUrl = () => process.env.ETUPAY_URL;
