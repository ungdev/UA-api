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
        "Tu es bien inscrit.e à l'UTT Arena ! Tu trouveras ce-joint ton ticket pour l'évènement. Tu peux aussi le retrouver sur la billetterie, dans l'onglet \"Mon compte\".",
        'Pour rappel, tous les tournois débutent samedi à 10h, il faudra donc être présent *à partir de 9h00* pour un check-in de toutes les équipes et joueurs',
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
          'ton billet (que tu trouveras en pièce jointe)',
          "une pièce d'identité (type carte d'identité ou permis de conduire)",
        ],
        "Nous te conseillons d'emporter également",
        [
          'Une gourde *vide*',
          'Un tupperware. _Apporter de la nourriture est interdit_',
          "une multiprise puisque tu n'auras sinon qu'une prise pour brancher tout ton setup",
          'un câble ethernet',
          'ton setup',
          'de quoi dormir si tu souhaites passer la nuit sur place _(par exemple un tapis de sol)_',
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
      },
      include: { item: true, forUser: true },
    });
    return Promise.all([generateTicket(cartItem)]);
  },
};
