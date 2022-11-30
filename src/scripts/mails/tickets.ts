import { UserType, TransactionState } from '@prisma/client';
import { MailGoal } from '.';
import database from '../../services/database';
import { generateTicket } from '../../utils/pdf';

export const ticketsGoal: MailGoal = {
  collector: () =>
    database.user.findMany({
      where: {
        discordId: {
          not: null,
        },
        email: {
          not: null,
        },
        OR: [
          {
            team: {
              lockedAt: {
                not: null,
              },
            },
          },
          {
            type: UserType.spectator,
          },
        ],
        cartItems: {
          some: {
            itemId: {
              startsWith: 'ticket-',
            },
            cart: {
              paidAt: {
                not: null,
              },
              transactionState: TransactionState.paid,
            },
          },
        },
      },
    }),
  sections: [
    {
      title: "Ton ticket pour l'UTT Arena",
      components: [
        "*Suite à une erreur de notre côté, nous avons désactivé le billet que tu as reçu précédemment. Tu trouveras ci-joint le nouveau billet que tu devras présenter à l'UTT Arena.*",
        "Tu es bien inscrit à l'UTT Arena ! Tu trouveras ci-joint ton billet, que tu devras présenter à l'entrée de l'UTT Arena. Tu peux aussi le retrouver sur la billetterie, dans l'onglet \"Mon compte\" de ton Dashboard.",
        'Attention, tous les tournois débutent à 11h, *il faudra donc être présent dès 9h00 pour un check-in de toutes les équipes et joueurs.*',
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
        "Nous te conseillerons d'emporter également",
        [
          'Une gourde *vide*',
          "une multiprise puisque tu n'auras *qu'une seule prise mise à ta disposition pour brancher tout ton setup*",
          "un câble ethernet (d'environ 7m)",
          'ton setup',
          'de quoi dormir si tu souhaite passer la nuit sur place (tapis de sol, sac de couchage, etc.)',
        ],
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
    return Promise.all([generateTicket(cartItem)]);
  },
};
