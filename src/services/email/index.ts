import nodemailer from 'nodemailer';
import { Log } from '@prisma/client';
import { DetailedCart, EmailAttachement, RawUser, User, MailQuery } from '../../types';
import env from '../../utils/env';
import logger from '../../utils/logger';
import { generateTicketsEmail, generateValidationEmail, generatePasswordResetEmail } from './serializer';
import type { SerializedMail } from './types';
import database from '../database';

export type { Component, Mail, SerializedMail } from './types';

export const getEmailsLogs = async () =>
  (await database.log.findMany({
    where: {
      AND: {
        method: 'POST',
        path: `${env.api.prefix}${env.api.prefix === '/' ? '' : '/'}admin/emails`,
      },
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })) as (Log & {
    body: MailQuery;
    user: RawUser;
  })[];

const emailOptions = env.email.gmail
  ? {
      service: 'gmail',
      auth: {
        user: env.email.username,
        pass: env.email.password,
      },
    }
  : env.email.uri;

export const transporter = nodemailer.createTransport(emailOptions);

/**
 * Sends a mail (using the smtp server).
 * @param mail the serialized mail to send
 * @param attachments attachments of the mail, if there are some
 * @returns a promise that resolves when the has been sent
 * @example
 * sendEmail(await serialize({
 *  receiver: 'user@domain.tld',
 *  reason: "You received this mail because you're part of our newsletter program",
 *  title: {
 *    topic: 'This is the content that is prepended to the mail subject',
 *    banner: 'This is the content that is displayed beside of the logo, at the top of the mail',
 *    short: 'This is the little title at the beginning of the text section',
 *    highlight: 'This is the big text rendered right after the short text',
 *  },
 *  sections: [
 *    {
 *      title: 'Section title',
 *      components: [
 *        "This section only contains one paragraph. It could also contain buttons, lists, " +
 *        "button lists, tables (well... it already contains tables, don't tell me about it !)",
 *      ]
 *    }
 *  ]
 * }))
 */
export const sendEmail = async (mail: SerializedMail, attachments?: EmailAttachement[]) => {
  const from = `${env.email.sender.name} <${env.email.sender.address}>`;

  try {
    await transporter.sendMail({
      from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      attachments,
    });

    logger.info(`Email sent to ${mail.to}`);
  } catch {
    logger.warn(`Could not send email to ${mail.to}`);
  }
};

/**
 * Sends an email to the user, containing information about the event,
 * a list of all items bought on the store and his tickets.
 * @param cart the cart of the user
 * @returns a promise that resolves when the mail has been sent
 * @throws an error if the mail declared above (corresponding to this
 * request) is invalid ie. contains an object which is not a {@link Component}
 */
export const sendPaymentConfirmation = async (cart: DetailedCart) => {
  const content = await generateTicketsEmail(cart);
  return sendEmail(content);
};

/**
 * Sends an email to the user with his account validation code.
 * This code (given to the user as a link) is required before logging in
 * @param user the user to send the mail to
 * @returns a promise that resolves when the mail was GENERATED. We don't wait
 * for the mail to be sent as it may take time (for several reasons, including mail
 * processing and network delays) and we don't want the current request to timeout
 * @throws an error if the mail declared above (corresponding to this
 * request) is invalid ie. contains an object which is not a {@link Component}
 */
export const sendValidationCode = async (user: RawUser | User) => sendEmail(await generateValidationEmail(user));

/**
 * Sends an email to the user with a password reset link.
 * @param user the user to send the mail to
 * @returns a promise that resolves when the mail was GENERATED. We don't wait
 * for the mail to be sent as it may take time (for several reasons, including mail
 * processing and network delays) and we don't want the current request to timeout
 * @throws an error if the mail declared above (corresponding to this
 * request) is invalid ie. contains an object which is not a {@link Component}
 */
export const sendPasswordReset = async (user: RawUser) => sendEmail(await generatePasswordResetEmail(user));
