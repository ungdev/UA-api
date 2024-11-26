import { RawUser, TransactionState } from '../../../types';
import { serialize } from '..';
import database from '../../database';
import { generateTicket } from '../../../utils/ticket';

export const generateTicketsEmail = async (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    reason: 'Tu as reçu ce mail car tu as créé un compte sur arena.utt.fr',
    title: {
      banner: 'On se retrouve ce weekend !',
      highlight: `Salut ${user.firstname}`,
      short: "L'UTT Arena arrive à grands pas 🔥",
      topic: "Ton ticket pour l'UTT Arena",
    },
    receiver: user.email,
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
    attachments: await (async () => {
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
    })(),
  });
