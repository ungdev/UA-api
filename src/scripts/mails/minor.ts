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
        "Tu nous as indiqué que tu seras mineur à la date de l'UTT Arena. N'oublie pas de préparer *ton autorisation parentale, et une photocopie de ta pièce d'identité, et de celle de ton responsable légal* !",
        "La vérification se fera à l'entrée de l'UTT Arena, n'hésites pas à envoyer à l'avance ces documents par mail à arena@utt.fr pour simplifier la procédure à l'entrée.",
        {
          location: 'https://arena.utt.fr/uploads/files/Autorisation_parentale_-_UTT_Arena_2022.pdf',
          name: "Télécharger l'autorisation parentale",
        },
      ],
    },
  ],
  attachments: async () => [] as EmailAttachement[],
};
