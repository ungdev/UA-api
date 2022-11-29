import { MailGoal } from '.';
import database from '../../services/database';
import { EmailAttachement, TransactionState, UserAge } from '../../types';

export const minorGoal: MailGoal = {
  collector: () =>
    database.user.findMany({
      where: {
        discordId: {
          not: null,
        },
        email: {
          not: null,
        },
        age: UserAge.child,
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
      title: 'Autorisation parentale',
      components: [
        "Tu nous as indiqué que tu seras mineur pendant l'UTT Arena. N'oublie pas de préparer ton autorisation parentale ! Si tu veux que ça te prenne moins de temps à vérifier lors de ton arrivée sur place, n'hésite pas à nous l'envoyer à l'avance par mail à arena@utt.fr !",
        {
          location: 'https://arena.utt.fr/uploads/files/Autorisation_parentale_-_UTT_Arena_2022.pdf',
          name: "Télécharger l'autorisation parentale",
        },
      ],
    },
  ],
  attachments: async () => [] as EmailAttachement[],
};
