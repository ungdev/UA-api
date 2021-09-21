import { ItemCategory } from '@prisma/client';
import { readFile } from 'fs/promises';
import { render } from 'mustache';
import nodemailer from 'nodemailer';
import { ActionFeedback, DetailedCart, EmailAttachement, User } from '../types';
import { escapeText, inflate } from '../utils/email';
import env from '../utils/env';
import { formatPrice } from '../utils/helpers';
import logger from '../utils/logger';
import { generateTicket } from '../utils/pdf';
import type { Mail, SerializedMail, Component } from './mail';

/**
 * Applied {@link Mail} content in the template
 * @throws an error when an unknwon component is in the {@link Mail#sections#components}
 */
const serialize = async (content: Mail) => {
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
  };
};

export const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  auth: {
    user: env.email.user,
    pass: env.email.password,
  },
  pool: true,
  secure: false,
  maxConnections: 1,
  tls: {
    // Rejects TLS errors only if we are not in test environment. (Rejects due to self signed certificate)
    rejectUnauthorized: !env.test,
  },
});

export const sendEmail = async (mail: SerializedMail, attachments?: EmailAttachement[]) => {
  const from = `${env.email.sender.name} <${env.email.sender.address}>`;

  await transporter.sendMail({
    from,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    attachments,
  });

  logger.info(`Email sent to ${mail.to}`);
};

export const generateTicketsEmail = (cart: DetailedCart) =>
  serialize({
    title: {
      topic: 'Bienvenue',
      banner: 'Informations importantes',
      short: `Salut ${cart.user.firstname},`,
      highlight: "Bienvenue à l'UTT Arena&nbsp;🔥&nbsp;!",
    },
    reason:
      "Vous avez reçu cet email car vous êtes inscrit à l'UTT Arena. Si ce n'est pas le cas, contactez-nous et changez le mot de passe de votre boîte mail.",
    receiver: cart.user.email,
    sections: [
      {
        title: 'Tournoi',
        components: [
          'Voilà les dernières informations importantes nécessaires au bon déroulement de la compétition&nbsp;:',
          [
            'Il est nécessaire que *tous les joueurs* de *toutes les équipes* soient présents sur notre Discord',
            "Ce vendredi à 21h aura lieu une cérémonie d'ouverture sur notre stream où on vous donnera tous les détails de cette édition un peu spéciale et où on répondra à toutes vos questions 😁",
            'Tous les tournois débutent samedi à 10h, il faudra donc être présent *à partir de 9h30* pour un check-in de toutes les équipes et joueurs',
            "N'hésitez à contacter un membre du staff sur Discord si vous avez une question ou que vous rencontrez un quelconque problème 😉",
          ],
          {
            name: 'Rejoindre le serveur Discord',
            location: 'https://discord.gg/WhxZwKU',
          },
        ],
      },
      {
        title: 'Billet',
        components: ['Tu trouveras ton *billet personnalisé* en pièce jointe de ce mail&nbsp;!'],
      },
      {
        title: 'Confirmation de commande',
        components: [
          'On te confirme aussi ta commande _(et tu as bon goût&nbsp;!)_',
          {
            name: 'Tickets',
            items: [
              {
                name: '*Nom*',
                type: '*Type*',
                price: '*Prix*',
              },
              ...cart.cartItems
                .filter((cartItem) => cartItem.item.category === ItemCategory.ticket)
                .map((ticket) => ({
                  name: `${ticket.forUser.firstname} ${ticket.forUser.lastname}`,
                  type: ticket.item.name,
                  price: formatPrice(ticket.item.price),
                })),
            ],
          },
          {
            name: 'Suppléments',
            items: [
              {
                name: '*Nom*',
                amount: '*Quantité*',
                price: '*Prix*',
              },
              ...cart.cartItems
                .filter((cartItem) => cartItem.item.category === ItemCategory.supplement)
                .map((item) => ({
                  name: item.item.name,
                  amount: `${item.quantity}`,
                  price: formatPrice(item.item.price),
                })),
            ],
          },
        ],
      },
    ],
  });

export const generateValidationEmail = (user: Omit<User, 'hasPaid' | 'cartItems'>) =>
  serialize({
    receiver: user.email,
    reason:
      "Vous avez reçu ce mail car vous avez envoyé une demande de création de compte à l'UTT Arena. Si ce n'est pas vous, ignorez ce message ou contactez nous.",
    title: {
      topic: 'Code de validation',
      banner: 'Création du compte',
      short: `Salut ${user.firstname},`,
      highlight: "Bienvenue à l'UTT Arena&nbsp;!",
    },
    sections: [
      {
        title: 'Avant de commencer...',
        components: [
          "On sait bien que c'est pénible mais on doit vérifier que ton adresse email fonctionne bien (sinon tu ne pourras pas recevoir tes billets&nbsp;!).",
          {
            name: 'Confirme ton adresse email',
            location: `${env.front.website}/?action=${ActionFeedback.VALIDATE}&state=${user.registerToken}` as const,
          },
        ],
      },
      {
        title: 'Discord',
        components: [
          "On utilise Discord pendant l'évènement, et tu auras besoin de lier ton compte discord avec ton compte UTT Arena pour pouvoir créer ou rejoindre une équipe. On te donnera plus de détails là-dessus à ce moment-là 😉",
        ],
      },
      {
        title: 'Tournoi Super Smash Bros Ultimate',
        components: [
          "Si tu as choisi de t'inscrire à ce tournoi et que tu choisis de venir avec ta propre console, tu peux bénéficier d'une réduction sur ton billet 😉 _(offre limitée à un certain nombre de places)_",
        ],
      },
      {
        title: 'Des questions ?',
        components: [
          "On t'invite à lire la faq ou à poser tes questions directement sur discord.",
          [
            {
              name: 'FAQ',
              location: `${env.front.website}/faq`,
            },
            {
              name: 'Rejoindre le serveur Discord',
              location: 'https://discord.gg/WhxZwKU',
            },
          ],
        ],
      },
    ],
  });

export const generatePasswordResetEmail = (user: User) =>
  serialize({
    receiver: user.email,
    reason:
      "Vous avez reçu ce mail car vous avez demandé à réinitialiser votre mot de passe. Si ce n'est pas le cas, ignorez ce message.",
    title: {
      topic: 'Réinitialisation de votre mot de passe',
      banner: 'Réinitialisation du mot de passe',
      short: `Salut ${user.firstname},`,
      highlight: 'Tu es sur le point de réinitialiser ton mot de passe',
    },
    sections: [
      {
        title: 'Code de vérification',
        components: [
          "On doit s'assurer que tu es bien à l'origine de cette demande. Tu peux finaliser la procédure en cliquant sur le bouton ci-dessous.",
          {
            name: 'Réinitialise ton mot de passe',
            location: `${env.front.website}/?action=${ActionFeedback.PASSWORD_RESET}&state=${user.resetToken}` as const,
            color: '#dc143c',
          },
        ],
      },
    ],
  });

/**
 * Sends an email to the user, containing information about the event,
 * a list of all items bought on the store and his tickets.
 * @param cart the cart of the user
 * @returns when the mail has been sent
 * @throws an error if the mail declared above (corresponding to this
 * request) is invalid ie. contains an object which is not a {@link Component}
 */
export const sendTickets = async (cart: DetailedCart) => {
  const cartTickets = cart.cartItems.filter((cartItem) => cartItem.item.category === ItemCategory.ticket);
  const [content, tickets] = await Promise.all([
    generateTicketsEmail(cart),
    Promise.all(cartTickets.map(generateTicket)),
  ]);
  return sendEmail(content, tickets);
};

/**
 * Sends an email to the user with his account validation code.
 * This code (given to the user as a link) is required before logging in
 * @param user the user to send the mail to
 * @returns when the mail was GENERATED. We don't wait for the mail to be sent
 * as it may take time (for several reasons, including mail processing and network
 * delays) and we don't want the current request to timeout
 * @throws an error if the mail declared above (corresponding to this
 * request) is invalid ie. contains an object which is not a {@link Component}
 */
export const sendValidationCode = async (user: Omit<User, 'hasPaid' | 'cartItems'>) =>
  sendEmail(await generateValidationEmail(user));

/**
 * Sends an email to the user with a password reset link.
 * @param user the user to send the mail to
 * @returns when the mail was GENERATED. We don't wait for the mail to be sent
 * as it may take time (for several reasons, including mail processing and network
 * delays) and we don't want the current request to timeout
 * @throws an error if the mail declared above (corresponding to this
 * request) is invalid ie. contains an object which is not a {@link Component}
 */
export const sendPasswordReset = async (user: User) => sendEmail(await generatePasswordResetEmail(user));
