import { ItemCategory } from '@prisma/client';
import { readFile } from 'fs/promises';
import { render, escape } from 'mustache';
import nodemailer from 'nodemailer';
import { ActionFeedback, DetailedCart, EmailAttachement, User } from '../types';
import env from '../utils/env';
import { formatPrice } from '../utils/helpers';
import logger from '../utils/logger';
import { generateTicket } from '../utils/pdf';

export declare interface Mail {
  /** The email address to send this email to (written in the footer, before the {@link reason}) */
  receiver: string;
  /** The reason why this mail was sent to the user. */
  reason: string;
  title: {
    /**
     * The title of the mail (in the html `title` tag).
     * This is also the subject of the mail.
     * Don't include 'UTT Arena {year}' as it is appended automatically
     * when generating the mail.
     */
    topic: string;
    /** The title displayed in the banner, next to the logo */
    banner: string;
    /**
     * The title (or part of title) displayed at the beginning of the content box,
     * in a small/regular font size
     */
    short: string;
    /**
     * The title (or part of title) displayed right after {@link title#short},
     * in a pretty big font size
     */
    highlight: string;
  };
  /**
   * The fields contained in your mail. If this property is omitted (or if the list is empty),
   * a default error field will be displayed instead.
   */
  fields?: {
    /** Name of the field, used as a field title */
    name: string;
    /** The content of this field. Like anywhere else in the mail,
     * use  - \n to go to a new line
     *      - *text* to render bold 'text'
     *      - _text_ to render 'text' in italics
     *      - &nbsp; to a render a non breakable space
     */
    description: string | string[];
    /** A list of buttons (can be omitted) which will be appended at the end of the section */
    buttons?: {
      /** Button text */
      name: string;
      /** Button link */
      location: string;
      /** Button color. Matches UA colors by default */
      color?: `#${string}`;
    }[];
    tables?: {
      name: string;
      headers: { name: string }[];
      items: {
        values: {
          name: string;
        }[];
      }[];
    }[];
  }[];
}

export declare interface MailContent {
  to: string;
  subject: string;
  html: string;
}

export const formatEmail = async (content: Mail) => {
  const template = await readFile('assets/email/template.html', 'utf8');
  const year = new Date().getFullYear();
  return <MailContent>{
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
        escape: (text: string) =>
          escape(text)
            .replace(/&amp;nbsp;/gi, '&nbsp;')
            .replace(/\n/gi, '<br>')
            .replace(/_([^<>_]+)_/gi, '<i>$1</i>')
            .replace(/\*([^*<>]+)\*/gi, '<strong>$1</strong>'),
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

export const sendEmail = async (mail: MailContent, attachments?: EmailAttachement[]) => {
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
export namespace Mail {
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
      fields: [
        {
          name: 'Tournoi',
          description: [
            'Voilà les dernières informations importantes nécessaires au bon déroulement de la compétition&nbsp;:',
            '• Il est nécessaire que *tous les joueurs* de *toutes les équipes* soient présents sur notre Discord',
            "• Ce vendredi à 21h aura lieu une cérémonie d'ouverture sur notre stream où on vous donnera tous les détails de cette édition un peu spéciale et où on répondra à toutes vos questions 😁",
            '• Tous les tournois débutent samedi à 10h, il faudra donc être présent *à partir de 9h30* pour un check-in de toutes les équipes et joueurs',
            "• N'hésitez à contacter un membre du staff sur Discord si vous avez une question ou que vous rencontrez un quelconque problème 😉",
          ].join('\n'),
          buttons: [
            {
              name: 'Rejoindre le serveur Discord',
              location: 'https://discord.gg/WhxZwKU',
            },
          ],
        },
        {
          name: 'Billet',
          description: 'Tu trouveras ton *billet personnalisé* en pièce jointe de ce mail&nbsp;!',
        },
        {
          name: 'Confirmation de commande',
          description: 'On te confirme aussi ta commande _(et tu as bon goût&nbsp;!)_',
          tables: [
            {
              name: 'Tickets',
              headers: [
                {
                  name: 'Nom',
                },
                {
                  name: 'Type',
                },
                {
                  name: 'Prix',
                },
              ],
              items: cartTickets.map((ticket) => ({
                values: [
                  {
                    name: `${ticket.forUser.firstname} ${ticket.forUser.lastname}`,
                  },
                  {
                    name: ticket.item.name,
                  },
                  {
                    name: formatPrice(ticket.item.price),
                  },
                ],
              })),
            },
            {
              name: 'Suppléments',
              headers: [
                {
                  name: 'Nom',
                },
                {
                  name: 'Quantité',
                },
                {
                  name: 'Prix',
                },
              ],
              items: cart.cartItems
                .filter((cartItem) => cartItem.item.category === ItemCategory.supplement)
                .map((item) => ({
                  values: [
                    {
                      name: item.item.name,
                    },
                    {
                      name: `${item.quantity}`,
                    },
                    {
                      name: formatPrice(item.item.price),
                    },
                  ],
                })),
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
        banner: '',
        short: `Salut ${user.firstname},`,
        highlight: "Bienvenue à l'UTT Arena&nbsp;!",
      },
      fields: [
        {
          name: 'Avant de commencer...',
          description:
            "On sait bien que c'est pénible mais on doit vérifier que ton adresse email fonctionne bien (sinon tu ne pourras pas recevoir tes billets&nbsp;!).",
          buttons: [
            {
              name: 'Confirme ton adresse email',
              location: `${env.front.website}/?action=${ActionFeedback.VALIDATE}&state=${user.registerToken}` as const,
            },
          ],
        },
        {
          name: 'Discord',
          description:
            "On utilise Discord pendant l'évènement, et tu auras besoin de lier ton compte discord avec ton compte UTT Arena pour pouvoir créer ou rejoindre une équipe. On te donnera plus de détails là-dessus à ce moment-là 😉",
        },
        {
          name: 'Tournoi Super Smash Bros Ultimate',
          description:
            "Si tu as choisi de t'inscrire à ce tournoi et que tu choisis de venir avec ta propre console, tu peux bénéficier d'une réduction sur ton billet 😉 _(offre limitée à un certain nombre de places)_",
        },
        {
          name: 'Des questions ?',
          description: "On t'invite à lire la faq ou à poser tes questions directement sur discord.",
          buttons: [
            {
              name: 'FAQ',
              location: `${env.front.website}/faq`,
            },
            {
              name: 'Rejoindre le serveur Discord',
              location: 'https://discord.gg/WhxZwKU',
            },
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
      fields: [
        {
          name: 'Code de vérification',
          description:
            "On doit s'assurer que tu es bien à l'origine de cette demande. Tu peux finaliser la procédure en cliquant sur le bouton ci-dessous.",
          buttons: [
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
