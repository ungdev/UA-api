import { UserType, TransactionState } from '../types';
import database from '../services/database';
import { fetchGuildMembers } from '../services/discord';
import { sendEmail } from '../services/email';
import { serialize } from '../services/email/serializer';
import logger from '../utils/logger';

(async () => {
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
      select: {
        email: true,
        discordId: true,
        firstname: true,
      },
    }),
  ]);
  const recipients = users.filter((user) => !members.includes(user.discordId));

  const outgoingMails = await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        const mailContent = await serialize({
          sections: [
            {
              title:
                "Il semblerait que tu ne sois pas sur le serveur, il faut cependant que tu le rejoignes car c'est notre principal outil de communication avec toi",
              components: [
                {
                  name: 'Rejoindre le serveur Discord',
                  location: 'https://discord.gg/WhxZwKU',
                },
              ],
            },
          ],
          reason:
            "Tu as reçu ce mail car tu es inscrit à l'UTT Arena et que tu n'a pas rejoint le serveur discord de l'évènement",
          title: {
            banner: "Rejoins le discord de l'UTT Arena",
            highlight: `Cher ${recipient.firstname}`,
            short: '',
            topic: 'Rejoins notre discord',
          },
          receiver: recipient.email,
        });
        return sendEmail(mailContent);
      } catch {
        return Promise.reject(recipient.email);
      }
    }),
  );

  // Counts mail statuses
  const results = outgoingMails.reduce(
    (result, state) => {
      if (state.status === 'fulfilled')
        return {
          ...result,
          delivered: result.delivered + 1,
        };
      return {
        ...result,
        undelivered: result.undelivered + 1,
      };
    },
    { delivered: 0, undelivered: 0 },
  );

  // eslint-disable-next-line no-console
  console.info(`\tMails envoyés: ${results.delivered}\n\tMails non envoyés: ${results.undelivered}`);
})().catch((error) => {
  logger.error(error);
});
