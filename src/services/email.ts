import { ItemCategory } from '@prisma/client';
import { readFile } from 'fs/promises';
import { render } from 'mustache';
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
    /** The content of this field. This field is NOT escaped (ie. tags are not escaped) */
    description: string | string[];
    /** A list of buttons (can be omitted) which will be appended at the end of the section */
    buttons?: {
      /** Button text */
      name: string;
      /** Button link */
      location: `http${'s' | ''}://${string}`;
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
    html: render(template, {
      ...content,
      year,
    }),
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
  export const sendTickets = async (cart: DetailedCart) => {
    const cartTickets = cart.cartItems.filter((cartItem) => cartItem.item.category === ItemCategory.ticket);
    const [content, tickets] = await Promise.all([
      formatEmail({
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
              'Voilà les dernières informations importantes nécessaires au bon déroulement de la compétition 😁',
              '• Il est nécessaire que <strong>tous les joueurs</strong> de <strong>toutes les équipes</strong> soient présents sur notre Discord',
              "• Ce vendredi à 21h aura lieu une cérémonie d'ouverture sur notre stream où on vous donnera tous les détails de cette édition un peu spéciale et où on répondra à toutes vos questions 😁",
              '• Tous les tournois débutent samedi à 10h, il faudra donc être présent <strong>à partir de 9h30 </strong>pour un check-in de toutes les équipes et joueurs',
              "• N'hésitez à contacter un membre du staff sur Discord si vous avez une question ou que vous rencontrez un quelconque problème 😉",
            ],
            buttons: [
              {
                name: 'Rejoindre le serveur Discord',
                location: 'https://discord.gg/WhxZwKU',
              },
            ],
          },
          {
            name: 'Billet',
            description: 'Tu trouveras ton <strong>billet personnalisé</strong> en pièce jointe de ce mail&nbsp;!',
          },
          {
            name: 'Confirmation de commande',
            description: 'On te confirme aussi ta commande (et tu as bon goût&nbsp;!)',
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
      }),
      Promise.all(cartTickets.map(generateTicket)),
    ]);
    return sendEmail(content, tickets);
  };

  export const sendValidationCode = async (user: Omit<User, 'hasPaid' | 'cartItems'>) =>
    sendEmail(
      await formatEmail({
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
              "On sait bien que c'est pénible mais on doit vérifier que ton adresse email fonctionne bien (sinon tu ne pourra pas recevoir tes billets&nbsp;!).",
            buttons: [
              {
                name: 'Confirme ton adresse email',
                location: `https://arena.utt.fr/?action=${ActionFeedback.VALIDATE}&state=${user.registerToken}`,
              },
            ],
          },
          {
            name: 'Discord',
            description:
              "On utilise Discord pendant l'évènement, mais tu auras besoin de lier ton compte discord avec ton compte UTT Arena pour pouvoir créer ou rejoindre une équipe. Tu auras des détails là dessus à ce moment là 😉",
          },
          {
            name: 'Tournoi Super Smash Bros Ultimate',
            description:
              "Si tu as choisi de t'inscrire à ce tournoi et que tu choisis de venir avec ta propre console, tu peux bénéficier d'une réduction sur ton billet 😉 (offre limitée à un certain nombre de places)",
          },
          {
            name: 'Des questions ?',
            description: "On t'invite à lire la faq ou à poser tes questions directement sur discord.",
            buttons: [
              {
                name: 'FAQ',
                location: 'https://arena.utt.fr/faq',
              },
              {
                name: 'Rejoindre le serveur Discord',
                location: 'https://discord.gg/WhxZwKU',
              },
            ],
          },
        ],
      }),
    );
}
