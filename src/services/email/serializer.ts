import { readFile } from 'fs/promises';
import { render } from 'mustache';
import { ActionFeedback, DetailedCart, RawUser, ItemCategory } from '../../types';
import { escapeText, inflate, style } from './components';
import env from '../../utils/env';
import { formatPrice } from '../../utils/helpers';
import type { Mail, SerializedMail, Component } from '.';
import { use } from 'chai';

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
  };
};

export const generateOrderEmail = (cart: DetailedCart) =>
  serialize({
    title: {
      topic: 'Confirmation de commande',
      banner: 'Informations importantes',
      short: `Salut ${cart.user.firstname},`,
      highlight: "Bienvenue à l'UTT Arena&nbsp;🔥&nbsp;!",
    },
    reason:
      "Tu as reçu cet email car tu es inscrit à l'UTT Arena 2024. Si ce n'est pas le cas, contacte-nous et change le mot de passe de ta boîte mail.",
    receiver: cart.user.email,
    sections: [
      {
        title: 'Confirmation de commande',
        components: [
          'On te confirme aussi ta commande',
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
                  price: formatPrice(ticket.reducedPrice ?? ticket.price),
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
                  price: formatPrice(item.reducedPrice ?? item.price),
                })),
            ],
          },
          {
            name: 'Location de matériel',
            items: [
              {
                name: '*Nom*',
                amount: '*Quantité*',
                price: '*Prix*',
              },
              ...cart.cartItems
                .filter((cartItem) => cartItem.item.category === ItemCategory.rent)
                .map((item) => ({
                  name: item.item.name,
                  amount: `${item.quantity}`,
                  price: formatPrice(item.reducedPrice ?? item.price),
                })),
            ],
          },
        ],
      },
      {
        title: 'Tournoi',
        components: [
          'Voilà les dernières informations importantes nécessaires au bon déroulement de la compétition&nbsp;:',
          [
            'Il est nécessaire que *tous les joueurs* de *toutes les équipes* soient présents sur notre Discord',
            'Tous les tournois débutent samedi à 10h, il faudra donc être présent *à partir de 9h00* pour un check-in de toutes les équipes et joueurs',
            "N'hésite pas à contacter un membre du staff sur Discord si tu as une question ou que tu rencontres un quelconque problème 😉",
          ],
          {
            name: 'Rejoindre le serveur Discord',
            location: 'https://discord.gg/WhxZwKU',
          },
        ],
      },
      {
        title: 'Billet',
        components: ["Tu recevras ton *billet personnalisé* par mail quelques jours avant l'UTT Arena&nbsp;!"],
      },
    ],
  });

export const generateValidationEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    receiver: user.email,
    reason:
      "Tu as reçu ce mail car tu as envoyé une demande de création de compte à l'UTT Arena. Si ce n'est pas toi, ignore ce message ou contacte-nous.",
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
            location: `${env.front.website}/${ActionFeedback.VALIDATE}/${user.registerToken}`,
          },
          `_Si le bouton ne marche pas, tu peux utiliser ce lien:_\n_${env.front.website}/${ActionFeedback.VALIDATE}/${user.registerToken}_`,
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
          "On t'invite à lire la FAQ ou à poser tes questions directement sur Discord.",
          [
            {
              name: 'FAQ',
              location: `${env.front.website}/help`,
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

export const generatePasswordResetEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    receiver: user.email,
    reason:
      "Tu as reçu ce mail car tu as demandé à réinitialiser ton mot de passe. Si ce n'est pas le cas, ignore ce message.",
    title: {
      topic: 'Réinitialisation de ton mot de passe',
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
            location: `${env.front.website}/${ActionFeedback.PASSWORD_RESET}/${user.resetToken}`,
          },
          `_Si le bouton ne marche pas, tu peux utiliser ce lien:_\n_${env.front.website}/${ActionFeedback.PASSWORD_RESET}/${user.resetToken}_`,
        ],
      },
    ],
  });

export const generateTicketsEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    receiver: user.email,
    reason: "Tu as reçu ce mail car tu semble ne pas avoir reçu ton ticket. Si ce n'est pas le cas, ignore ce message.",
    title: {
      topic: "Ton ticket pour l'UTT arena",
      banner: 'Informations importantes',
      short: `Salut ${user.firstname},`,
      highlight: `Voici ton ticket pour l'UTT arena`,
    },
    sections: [
      {
        title: "Ton ticket pour l'UTT Arena",
        components: [
          "Tu es bien inscrit à l'UTT Arena ! Tu trouveras ci-joint ton billet, que tu devras présenter à l'entrée de l'UTT Arena. Tu peux aussi le retrouver sur la billetterie, dans l'onglet \"Mon compte\" de ton Dashboard.",
          'Attention, tous les tournois débutent à 10h, *il faudra donc être présent dès 9h00 pour un check-in de toutes les équipes et joueurs.*',
          {
            location: 'https://arena.utt.fr/dashboard/account',
            name: 'Accéder à arena.utt.fr',
          },
        ],
      },
      {
        title: 'Ce que tu dois emporter',
        components: [
          "Pour rentrer à l'UTT Arena, tu auras besoin de",
          [
            'ton *billet* (que tu trouveras en pièce jointe, ou sur le site)',
            "une *pièce d'identité* (type carte d'identité, titre de séjour ou permis de conduire)",
          ],
          "Nous te conseillons d'emporter également",
          [
            'Une gourde *vide*',
            "une multiprise puisque tu n'auras *qu'une seule prise mise à ta disposition pour brancher tout ton setup*",
            "un câble ethernet (d'environ 7m)",
            'ton setup',
          ],
          "Si tu as encore des questions, n'hésite pas à regarder notre FAQ ou à poser la question sur le serveur discord !",
          {
            location: 'https://arena.utt.fr/help',
            name: 'Ouvrir la FAQ',
          },
        ],
      },
    ],
    attachments: async (user) => {
      const cartItem = await database.cartItem.findFirst({
        where: {
          cart: {
            paidAt: {
              not: null,
            },
            transactionState: TransactionState.paid,
          },
          itemId: `ticket-${user.type}`,
          forUserId: user.id,
        },
        include: { item: true, forUser: true },
      });
      return [await generateTicket(cartItem)];
    },
  });
