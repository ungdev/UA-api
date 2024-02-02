import { User } from '@prisma/client';
import { sendEmail } from '../../services/email';
import { serialize } from '../../services/email/serializer';
// eslint-disable-next-line import/no-unresolved
import { Mail } from '../../services/email/types';
import { EmailAttachement } from '../../types';
import logger from '../../utils/logger';
import { ticketsGoal } from './tickets';
import { notPaidGoal } from './notpaid';
import { notPaidSSBUGoal } from './notpaidssbu';
import { discordGoal } from './discord';
import { minorGoal } from './minor';
import { unlockedPlayersGoal } from './unlocked';

export type RecipientCollector = () => Promise<User[]>;
export type MailGoal = {
  collector: RecipientCollector;
  sections: Mail['sections'];
  attachments: (user: User) => Promise<EmailAttachement[]>;
};

const availableGoals: {
  [key: string]: MailGoal;
} = {
  discord: discordGoal,
  mineurs: minorGoal,
  tickets: ticketsGoal,
  paslock: unlockedPlayersGoal,
  paspayé: notPaidGoal,
  paspayéssbu: notPaidSSBUGoal,
};

(async () => {
  const records: { [key: string]: { sections: Mail['sections']; user: User; attachments: EmailAttachement[] } } = {};

  if (process.argv.length <= 2) {
    throw new Error(
      `ERREUR : Tu dois donner au moins un type de mails à envoyer parmi les suivants : ${Object.keys(
        availableGoals,
      ).join(' ')}`,
    );
  }
  // Convert goal names to
  const goals = process.argv
    .splice(2)
    .map((name: string) => {
      if (name in availableGoals) {
        logger.info(`[Scheduled] ${name}`);
        return availableGoals[name];
      }
      logger.error(`[Skipping] ${name}: Not found`);
      return null;
    })
    .filter((goal) => !!goal);

  for (const { collector, sections, attachments } of goals) {
    const targets = await collector();
    for (const user of targets) {
      if (user.email in records) {
        records[user.email].sections.push(...sections);
        records[user.email].attachments.push(...(await attachments(user)));
      } else {
        records[user.email] = {
          sections: [...sections],
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
            banner: 'On se retrouve ce weekend !',
            highlight: `Cher ${mail.user.firstname}`,
            short: "L'UTT Arena arrive à grands pas 🔥",
            topic: "Ton ticket pour l'UTT Arena",
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
      logger.error(`Impossible d'envoyer de mail à ${state.reason}`);
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
