/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFile } from 'fs/promises';
import { render } from 'mustache';
import nodemailer from 'nodemailer';
import { Log } from '@prisma/client';
import { RawUser, MailQuery, User } from '../../types';
import env from '../../utils/env';
import logger from '../../utils/logger';
import type { Component, Mail, SerializedMail } from './types';
import database from '../database';
import { escapeText, inflate, style } from './components';
import { availableTemplates } from './templates';
import { availableGeneralMails } from './generalMails';

export type { Component, Mail, SerializedMail } from './types';

/**
 * Applied {@link Mail} content in the template
 * @throws an error when an unknwon component is in the {@link Mail#sections#components}
 */
export const serialize = async (content: Mail) => {
  const template = await readFile('assets/email/template.html', 'utf8');
  const year = new Date().getFullYear();
  return <SerializedMail>{
    to: content.receiver,
    subject: `${content.title.topic} - UTT Arena ${year}`,
    html: render(
      template,
      {
        ...content,
        year,
        style,
      },
      undefined,
      {
        escape: (text: Component[] | string): string =>
          // These are the elements mustache tries to write in the mail. They can be
          // full text or the list of components (cf. assets/email/template.html)
          // We escape text and handle components
          typeof text === 'string' ? escapeText(text) : text.map(inflate).join(''),
      },
    ),
    attachments: content.attachments,
  };
};

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

const emailOptions = {
  host: env.email.host,
  port: env.email.port,
  secure: env.email.secure,
  tls: {
    rejectUnauthorized: env.email.rejectUnauthorized,
  },
};

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
export const sendEmail = async (mail: SerializedMail) => {
  const from = `${env.email.sender.name} <${env.email.sender.address}>`;
  try {
    await transporter.sendMail({
      from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      attachments: mail.attachments,
    });

    logger.info(`Email sent to ${mail.to}`);
  } catch (error) {
    logger.warn(`Could not send email to ${mail.to}`);
    logger.error(error);
  }
};

export type MailGeneral = {
  // TODO: Fix this type
  targets: () => any;
  template: string;
};
// TODO: Fix this type
export type MailTemplate = (target: any) => Promise<SerializedMail>;
// TODO: Fix this type
export const sendMailsFromTemplate = async (template: string, targets: any[]) => {
  try {
    const mailTemplate = availableTemplates[template];

    if (targets.length === 0 && !mailTemplate) {
      return false;
    }

    if (targets.length > 1) {
      const outgoingMails = await Promise.allSettled(
        targets.map(async (target) => {
          const mail = await mailTemplate(target);
          await sendEmail(mail);
        }),
      );

      const results = outgoingMails.reduce(
        (result, state) => {
          if (state.status === 'fulfilled')
            return {
              ...result,
              delivered: result.delivered + 1,
            };
          logger.error(`Impossible d'envoyer de mail à ${state.reason}`);
          return {
            ...result,
            undelivered: result.undelivered + 1,
          };
        },
        { delivered: 0, undelivered: 0 },
      );

      // eslint-disable-next-line no-console
      console.info(`\tMails envoyés: ${results.delivered}\n\tMails non envoyés: ${results.undelivered}`);
      return results;
    }
    const mail = await mailTemplate(targets[0]);
    return sendEmail(mail);
  } catch (error) {
    logger.error('Error while sending emails', error);
    return false;
  }
};

export const sendGeneralMail = async (generalMail: string, previewUser: User | null = null) => {
  const mail = availableGeneralMails[generalMail];

  if (!mail) {
    return false;
  }

  const targets =
    previewUser == null ? await mail.targets() : [{ firstname: previewUser.firstname, email: previewUser.email }];
  await sendMailsFromTemplate(generalMail, targets);

  return targets.length;
};
