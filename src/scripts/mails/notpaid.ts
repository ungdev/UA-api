import { MailGoal } from '.';
import database from '../../services/database';
import { EmailAttachement } from '../../types';

export const notPaidGoal: MailGoal = {
  collector: () =>
    database.user.findMany({
      distinct: ['id'],
      where: {
        AND: [
          {
            OR: [
              {
                cartItems: {
                  some: {
                    AND: [
                      {
                        itemId: {
                          startsWith: 'ticket-',
                        },
                        forcePaid: false,
                      },
                      {
                        cart: {
                          transactionState: {
                            not: 'paid',
                          },
                        },
                      },
                    ],
                  },
                },
              },
              {
                cartItems: {
                  none: {},
                },
              },
            ],
          },
          {
            team: {
              lockedAt: null,
            },
          },
        ],
      },
    }),
  sections: [
    {
      title: "Ton inscription n'a pas été confirmée",
      components: [
        "L'UTT Arena approche à grand pas, et ton inscription n'est pas encore confirmée. Pour verrouiller ta place, il ne te reste plus qu'à la payer en accédant à la boutique sur le site. \nSi le tournoi auquel tu souhaites participer est d'ores-et-déjà rempli, tu sera placé en file d'attente.",
        "\n_Si le taux de remplissage d'un tournoi est trop faible d'ici à deux semaines de l'évènement, l'équipe organisatrice se réserve le droit de l'annuler._",
        {
          location: 'https://arena.utt.fr/dashboard/team',
          name: 'Accéder à arena.utt.fr',
        },
      ],
    },
  ],
  // eslint-disable-next-line require-await
  attachments: async () => [] as EmailAttachement[],
};
