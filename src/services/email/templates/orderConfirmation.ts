import { DetailedCart, ItemCategory } from '../../../types';
import { serialize } from '..';
import { formatPrice } from '../../../utils/helpers';

export const generateOrderConfirmationEmail = (cart: DetailedCart) =>
  serialize({
    title: {
      topic: 'Confirmation de commande',
      banner: 'Informations importantes',
      short: `Salut ${cart.user.firstname},`,
      highlight: "Bienvenue à l'UTT Arena&nbsp;🔥&nbsp;!",
    },
    reason:
      "Tu as reçu cet email car tu es inscrit à l'UTT Arena 2025. Si ce n'est pas le cas, contacte-nous et change le mot de passe de ta boîte mail.",
    receiver: cart.user.email,
    sections: [
      {
        title: 'Confirmation de commande',
        components: [
          'On te confirme ta commande',
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
            location: 'https://discord.gg/tkRrVZYXmT',
          },
        ],
      },
      {
        title: 'Billet',
        components: ["Tu recevras ton *billet personnalisé* par mail quelques jours avant l'UTT Arena&nbsp;!"],
      },
    ],
    attachments: [],
  });
