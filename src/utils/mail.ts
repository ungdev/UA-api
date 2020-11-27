import { readFileSync } from 'fs';
import path from 'path';
import { render } from 'mustache';
import nodemailer from 'nodemailer';
import { Address } from 'nodemailer/lib/mailer';
import { EmailAttachment, EmailContent, MailData } from '../types';
import { mailHost, mailPort, mailPassword, mailSender, mailUser } from './environment';
import logger from './log';

const transporter = nodemailer.createTransport({
  host: mailHost(),
  port: mailPort(),
  auth: {
    user: mailUser(),
    pass: mailPassword(),
  },
  pool: true,
  maxConnections: 1,
  // rateDelta: 1,
  // rateLimit: 1,
});

// emailType for welcome mail with tickets and discount codes
export const sendWelcomeEmail = (data: MailData) => {
  const template = readFileSync('assets/email/welcome/welcome.html').toString();
  const mailContent = {
    title: 'Informations importantes - UTT Arena 2020',
    html: render(template, {
      username: data.username,
      gunnarCode: data.gunnarCode,
      compumsaCode: data.compumsaCode,
    }),
  } as EmailContent;
  return mailContent;
};

export const sendMail = async (
  emailType: { (data: MailData): EmailContent },
  to: string | Address | Array<string | Address>,
  data: MailData,
  attachments?: EmailAttachment[],
) => {
  const mailContent = emailType(data);
  const info = await transporter
    .sendMail({
      from: mailSender(),
      to,
      subject: mailContent.title,
      html: mailContent.html,
      attachments,
    })
    .then((response) => {
      if (response.messageId) {
        logger.debug(response.messageId);
      } else {
        const logMessage = `Mail to ${to} not delivered ?`;
        logger.error(logMessage);
      }
    });
  return info;
};
