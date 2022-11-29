import { UserType, TransactionState } from '../types';
import database from '../services/database';
import { sendEmail } from '../services/email';
import { serialize } from '../services/email/serializer';
import logger from '../utils/logger';
import { generateTicket } from '../utils/pdf';
import { fetchCartItem } from '../operations/cartItem';

(async () => {
  const users = await database.user.findMany({
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
      cartItems: true,
    },
  });
  const recipients = users;

  const outgoingMails = await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        const mailContent = await serialize({
          sections: [
            {
              title: "Tu t'es inscrit/e à L'UTT Arena, voici ton ticket d'entrée",
              components: [],
            },
          ],
          reason: "Tu as reçu ce mail pour te donner ton ticket d'entrée pour l'UTT Arena.",
          title: {
            banner: 'Voici ton ticket',
            highlight: `Cher ${recipient.firstname}`,
            short: '',
            topic: 'Voici ton ticket',
          },
          receiver: recipient.email,
        });
        return sendEmail(mailContent, [
          await generateTicket(
            await fetchCartItem(recipient.cartItems.find((item) => item.itemId.startsWith('ticket-')).itemId),
          ),
        ]);
      } catch {
        throw recipient.email;
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
