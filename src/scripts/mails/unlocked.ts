import { TransactionState } from '@prisma/client';
import { MailGoal } from '.';
import database from '../../services/database';
import { EmailAttachement } from '../../types';

export const unlockedPlayersGoal: MailGoal = {
  collector: () =>
    database.user.findMany({
      where: {
        discordId: {
          not: null,
        },
        email: {
          not: null,
        },
        team: {
          lockedAt: null,
        },
        cartItems: {
          some: {
            itemId: {
              startsWith: 'ticket-',
            },
            cart: {
              transactionState: TransactionState.paid,
            },
          },
        },
      },
    }),
  sections: [
    {
      title: "Ton inscription n'a pas été confirmée",
      components: [
        'L\'UTT Arena arrive, et tu n\'as plus que *jusqu\'à vendredi 16h pour confirmer ta participation*. Il ne te reste plus qu\'à cliquer sur "*Verrouiller mon équipe*" puis à te rendre sur la page "Mon compte" pour avoir accès à ton billet !',
        'Mais attention, une fois que tu seras verouillé, il sera impossible de changer de tournoi.',
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
