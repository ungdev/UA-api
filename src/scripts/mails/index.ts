import { User } from '@prisma/client';
import { sendEmail } from '../../services/email';
import { serialize } from '../../services/email/serializer';
import { Mail } from '../../services/email/types';
import { EmailAttachement } from '../../types';
import logger from '../../utils/logger';
import { discordGoal } from './discord';
import { minorGoal } from './minor';
import { ticketsGoal } from './tickets';
import { unlockedPlayersGoal } from './unlocked';

export type RecipientCollector = () => Promise<User[]>;
export type MailGoal = {
  collector: RecipientCollector;
  sections: Mail['sections'];
  attachments: (user: User) => Promise<EmailAttachement[]>;
};

const goals: Array<MailGoal> = [discordGoal, minorGoal, ticketsGoal, unlockedPlayersGoal];

(async () => {
  const records: { [key: string]: { sections: Mail['sections']; user: User; attachments: EmailAttachement[] } } = {};

  for (const { collector, sections, attachments } of goals) {
    const targets = await collector();
    for (const user of targets) {
      if (user.email in records) {
        records[user.email].sections.push(...sections);
        records[user.email].attachments.push(...(await attachments(user)));
      } else {
        records[user.email] = {
          sections,
          user,
          attachments: await attachments(user),
        };
      }
    }
  }

  const outgoingMails = await Promise.allSettled(
    Object.keys(records).map(async (recipientEmail) => {
      try {
        const mail = records[recipientEmail];
        const mailContent = await serialize({
          sections: mail.sections,
          reason: 'Tu as reçu ce mail car tu as créé un compte sur arena.utt.fr',
          title: {
            banner: 'J-3',
            highlight: `Cher ${mail.user.firstname}`,
            short: "L'UTT Arena arrive à grands pas 🔥",
            topic: "J-3 avant l'UTT Arena",
          },
          receiver: mail.user.email,
        });
        return sendEmail(mailContent, mail.attachments);
      } catch {
        throw recipientEmail;
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
      logger.info(`Impossible d'envoyer de mail à ${state.reason}`);
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
