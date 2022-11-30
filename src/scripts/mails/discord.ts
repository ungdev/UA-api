import { UserType, TransactionState } from '@prisma/client';
import { MailGoal } from '.';
import database from '../../services/database';
import { fetchGuildMembers } from '../../services/discord';
import { EmailAttachement } from '../../types';

export const discordGoal: MailGoal = {
  collector: async () => {
    const [members, users] = await Promise.all([
      fetchGuildMembers().then((list) => list.map((member) => member.user.id)),
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
    ]);
    return users.filter((user) => !members.includes(user.discordId));
  },
  sections: [
    {
      title: "Rejoins le serveur discord de l'UTT Arena !",
      components: [
        "Tu n'es pas encore sur le serveur discord Arena, nous te conseillons fortement de le rejoindre car il s'agit de notre principal outil de communication avec toi et les autres joueurs.",
        'Sur ce serveur, tu pourras également y discuter avec les autres joueurs, ou poser des questions aux organisateurs de ton tournoi.',
        {
          name: 'Rejoindre le serveur Discord',
          location: 'https://discord.gg/WhxZwKU',
        },
      ],
    },
  ],
  attachments: async () => [] as EmailAttachement[],
};
