import { readFileSync } from 'fs';
import path from 'path';
import { render } from 'mustache';
import nodemailer from 'nodemailer';
import { Address } from 'nodemailer/lib/mailer';
import { EmailAttachment, EmailContent, RegisterMailData } from '../../types';
import { mailSender, mailUri } from '../environment';

const template = readFileSync(path.join(__dirname, 'mail.html')).toString();

// emailType for registering mail
export const registerMail = (data: RegisterMailData) => {
  const mailContent = {
    title: 'Activez votre compte - UTT Arena 2019',
    // Use mustache to generate email content in HTML
    html: render(template, {
      title: 'INSCRIPTION',
      subtitle: `Bienvenue à l'UTT Arena, ${data.username} !`,
      content: 'Merci de vérifier votre e-mail en cliquant sur le bouton ci-dessous.',
      button_link: data.buttonLink,
      button_title: 'CONFIRMER MON INSCRIPTION',
    }),
  } as EmailContent;
  return mailContent;
};

export const sendMail = (
  emailType: { (data: RegisterMailData): EmailContent },
  to: string | Address | Array<string | Address>,
  data: RegisterMailData,
  attachments?: EmailAttachment[],
) => {
  const transporter = nodemailer.createTransport(mailUri());
  const mailContent = emailType(data);
  return transporter.sendMail({
    from: mailSender(),
    to,
    subject: mailContent.title,
    html: mailContent.html,
    attachments,
  });
};
