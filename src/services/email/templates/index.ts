import { MailTemplate } from '..';
import { generateAccountValidationEmail } from './accountValidation';
import { generateJoinDiscordEmail } from './joinDiscord';
import { generateLastYearPublicAnnounce } from './lastYearAnnounce';
import { generateMinorEmail } from './minor';
import { generateNotPaidEmail } from './notPaid';
import { generateNotPaidSSBUEmail } from './notPaidSsbu';
import { generateOrderConfirmationEmail } from './orderConfirmation';
import { generatePasswordResetEmail } from './passwordReset';
import { generateTicketsEmail } from './tickets';

export const availableTemplates: {
  [key: string]: MailTemplate;
} = {
  accountvalidation: generateAccountValidationEmail,
  joindiscord: generateJoinDiscordEmail,
  lastyearannounce: generateLastYearPublicAnnounce,
  minor: generateMinorEmail,
  notpaid: generateNotPaidEmail,
  notpaidssbu: generateNotPaidSSBUEmail,
  orderconfirmation: generateOrderConfirmationEmail,
  passwordreset: generatePasswordResetEmail,
  tickets: generateTicketsEmail,
};
