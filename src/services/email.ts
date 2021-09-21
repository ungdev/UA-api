import { ItemCategory } from '@prisma/client';
import { readFile } from 'fs/promises';
import { render, escape } from 'mustache';
import nodemailer from 'nodemailer';
import { ActionFeedback, DetailedCart, EmailAttachement, User } from '../types';
import env from '../utils/env';
import { formatPrice } from '../utils/helpers';
import logger from '../utils/logger';
import { generateTicket } from '../utils/pdf';
import type { Mail, SerializedMail, Component } from './emailContent';

export const formatEmail = async (content: Mail) => {
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
        escape: (text: Component): string => {
          const factory = (item: Component, raw = true): string => {
            if (typeof item === 'string') {
              // The item is a string. We escape it
              const escaped = escape(item)
                .replace(/&amp;nbsp;/gi, '&nbsp;')
                .replace(/\n/gi, '<br>')
                .replace(/_([^<>_]+)_/gi, '<i>$1</i>')
                .replace(/\*([^*<>]+)\*/gi, '<strong>$1</strong>');
              // If raw is true, it means this function is called directly from mustache
              // we return escaped text
              if (raw) return escaped;
              // Otherwise, the item is a component (string) and we wrap it in a table row
              return `<tr><td style="color:#202020;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;position:relative;font-family:Nunito">${escaped}</td></tr>`;
            }
            if (raw && Array.isArray(item))
              // The item is a components object of the Section. We parse its content
              return item.map((element: Component) => factory(element, false)).join('');
            if (Array.isArray(item) && typeof item[0] === 'string')
              // The item is a list of string. We render it as a list
              return `<tr><td><ul>${(<Array<string>>item)
                .map((listItem) => `<li style="font-family:Nunito">${factory(listItem)}</li>`)
                .join('')}</ul></td></tr>`;
            if (typeof item === 'object' && 'items' in item) {
              // The item is a table. We render it as a table
              const properties = Object.keys(item.items[0] ?? {});
              if (properties.length === 0) return '';
              const head = `<thead style="background-color:#333;color:#fff"><tr>${properties
                .map(
                  (propertyName, index) =>
                    `<td style="padding:5px${index === 0 ? '' : ';text-align:center'}">${factory(
                      item.items[0][propertyName],
                    )}</td>`,
                )
                .join('')}</tr></thead>`;
              const body = `<tbody>${item.items
                .slice(1)
                .map(
                  (row, rowIndex) =>
                    `<tr${rowIndex % 2 ? '' : ' style="background-color:#e8e8e8"'}>${properties
                      .map(
                        (propertyName, index) =>
                          `<td style="padding:5px${index === 0 ? '' : ';text-align:center'}">${factory(
                            row[propertyName],
                          )}</td>`,
                      )
                      .join('')}</tr>`,
                )
                .join('')}</tbody>`;
              return `${
                item.name ? `<tr><td style="font-size:18px;color:#006492;padding:8px 0">${item.name}</td></tr>` : ''
              }<tr><td><table style="width:100%;background-color:#f6f6f6;border-collapse:collapse;border-radius:4px;overflow:hidden;font-family:Nunito">${head}${body}</table></td></tr>`;
            }
            if (typeof item === 'object' && 'location' in item)
              // The item is a single button
              return `<tr><td><table style="border:none;border-collapse:collapse"><tbody><tr><td style="background-color:${
                item.color ? item.color : '#f1737f'
              };border-radius:2px;padding:3px 6px 2px"><a target="_blank" href="${factory(
                item.location,
              )}" style="border:none;text-decoration:none;color:#fff;user-select:none;font-family:Nunito">${
                item.name
              }</a></td></tr></tbody></table></td></tr>`;
            if (Array.isArray(item) && typeof item[0] !== 'string') {
              // The item is a list of buttons
              return `<tr><td><table style="border:none;border-spacing:5px"><tbody><tr>${(<Component.Button[]>item)
                .map(
                  (button) =>
                    `<td><table style="border:none;border-collapse:collapse"><tbody><tr><td style="background-color:${
                      button.color ? button.color : '#f1737f'
                    };border-radius:2px;padding:3px 6px 2px"><a target="_blank" href="${factory(
                      button.location,
                    )}" style="border:none;text-decoration:none;color:#fff;user-select:none;font-family:Nunito">${
                      button.name
                    }</a></td></tr></tbody></table></td>`,
                )
                .join('')}</tr></tbody></table></td></tr>`;
            }
            return '';
          };
          return factory(text);
        },
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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MailFactory {
  export const generateTicketsEmail = (cart: DetailedCart) => {
    const cartTickets = cart.cartItems.filter((cartItem) => cartItem.item.category === ItemCategory.ticket);
    return formatEmail({
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
                ...cartTickets.map((ticket) => ({
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
  };

  export const generateValidationEmail = (user: Omit<User, 'hasPaid' | 'cartItems'>) =>
    formatEmail({
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
    formatEmail({
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

  export const sendTickets = async (cart: DetailedCart) => {
    const cartTickets = cart.cartItems.filter((cartItem) => cartItem.item.category === ItemCategory.ticket);
    const [content, tickets] = await Promise.all([
      generateTicketsEmail(cart),
      Promise.all(cartTickets.map(generateTicket)),
    ]);
    return sendEmail(content, tickets);
  };

  export const sendValidationCode = async (user: Omit<User, 'hasPaid' | 'cartItems'>) =>
    sendEmail(await generateValidationEmail(user));

  export const sendPasswordReset = async (user: User) => sendEmail(await generatePasswordResetEmail(user));
}
