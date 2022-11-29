import { UserType, TransactionState, UserAge } from '../types';
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
      age: true,
    },
  });
  const recipients = users.filter((user) => user.age === UserAge.child);

  const outgoingMails = await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        const mailContent = await serialize({
          sections: [
            {
              title:
                'Il semblerait que tu sois mineur, tu peux nous envoyer ton autorisation parentale si tu le souhaite ou bien la rammener le jour même',
              components: [],
            },
          ],
          reason:
            "Tu as reçu ce mail pour t'annoncer que, comme tu es mineur, tu peux nous envoyer ton autorisation parentale, pour ne pas à l'avoir sur toi et t'encombrer le jour J.",
          title: {
            banner: 'Envoie nous ton autorisation parentale',
            highlight: `Cher ${recipient.firstname}`,
            short: '',
            topic: 'Envoie nous ton autorisation parentale',
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
