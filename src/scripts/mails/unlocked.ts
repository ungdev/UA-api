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
        'L\'UTT Arena arrive et tu n\'as pas encore confirmé ta participation. Il ne te reste plus qu\'à cliquer sur "Verrouiller mon équipe" ou "Verrouiller mon inscription". A partir du moment où tu le feras il ne te sera plus possible de changer de tournoi.',
        {
          location: 'https://arena.utt.fr/dashboard/team',
          name: 'Accéder à arena.utt.fr',
        },
      ],
    },
  ],
  attachments: async () => [] as EmailAttachement[],
};
