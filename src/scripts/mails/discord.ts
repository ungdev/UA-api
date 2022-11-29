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
        "Tu n'est pas sur le serveur discord de l'UTT Arena. Il faut cependant que tu le rejoignes car c'est notre principal outil de communication avec toi. Sur ce serveur, tu pourras également discuter avec les autres joueurs ainsi qu'avec ton équipe ou poser des questions aux organisateurs de ton tournoi.",
        {
          name: 'Rejoindre le serveur Discord',
          location: 'https://discord.gg/WhxZwKU',
        },
      ],
    },
  ],
  attachments: async () => [] as EmailAttachement[],
};
