import { TransactionState } from '../types';
import database from '../services/database';
import { sendEmail } from '../services/email';
import { serialize } from '../services/email/serializer';
import logger from '../utils/logger';

(async () => {
  const users = await database.user.findMany({
    where: {
      discordId: {
        not: null,
      },
      email: {
        not: null,
      },
      AND: [
        {
          team: {
            lockedAt: null,
          },
        },
      ],
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
    select: {
      email: true,
      discordId: true,
      firstname: true,
    },
  });
  const recipients = users;

  const outgoingMails = await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        const mailContent = await serialize({
          sections: [
            {
              title: "Tu as payé ta place mais ton équipe n'est pas lock.",
              components: [],
            },
          ],
          reason: "Tu as reçu ce mail car tu as payé ta place mais ton équipe n'est pas lock.",
          title: {
            banner: "Ton équipe n'est pas lock",
            highlight: `Cher ${recipient.firstname}`,
            short: '',
            topic: "Ton équipe n'est pas lock",
          },
          receiver: recipient.email,
        });
        return sendEmail(mailContent);
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
