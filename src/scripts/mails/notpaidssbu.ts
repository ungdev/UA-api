import { MailGoal } from '.';
import database from '../../services/database';
import { EmailAttachement } from '../../types';

export const notPaidSSBUGoal: MailGoal = {
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
              tournament: {
                id: 'ssbu',
              },
            },
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
        "L'UTT Arena approche à grand pas, et ton inscription pour le tournoi SSBU n'est pas encore confirmée. Pour verrouiller ta place, il ne te reste plus qu'à la payer en accédant à la boutique sur le site.",
        "\nN'oublie pas que tu peux décider de ramener ta propre Nintendo Switch avec SSBU (all DLCs) pour bénéficier d'une *réduction de 3€* sur ta place ! Cela permet également au tournoi de s'enchaîner de façon plus fluide.",
        "\nOn se retrouve le 1, 2, 3 décembre dans l'Arène !",
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
