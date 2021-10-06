import { User, ItemCategory } from '@prisma/client';
import { readFile } from 'fs/promises';
import { render } from 'mustache';
import { ActionFeedback, DetailedCart } from '../../types';
import { escapeText, inflate, style } from './components';
import env from '../../utils/env';
import { formatPrice } from '../../utils/helpers';
import type { Mail, SerializedMail, Component } from '.';

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

export const generateValidationEmail = (user: User) =>
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
            location: `${env.front.website}/?action=${ActionFeedback.VALIDATE}&state=${user.registerToken}`,
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
            location: `${env.front.website}/?action=${ActionFeedback.PASSWORD_RESET}&state=${user.resetToken}`,
            color: '#dc143c',
          },
        ],
      },
    ],
  });
