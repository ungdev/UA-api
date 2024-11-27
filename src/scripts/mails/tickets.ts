import { TransactionState } from '@prisma/client';
import { MailGoal } from '.';
import database from '../../services/database';
import { generateTicket } from '../../utils/ticket';
import { getNextPaidAndValidatedUserBatch } from '../../operations/user';
import env from '../../utils/env';

export const ticketsGoal: MailGoal = {
  collector: () => getNextPaidAndValidatedUserBatch(env.email.maxMailsPerBatch),
  sections: [
    {
      title: "Ton ticket pour l'UTT Arena",
      components: [
        "Tu es bien inscrit à l'UTT Arena ! Tu trouveras ci-joint ton billet, que tu devras présenter à l'entrée de l'UTT Arena. Tu peux aussi le retrouver sur la billetterie, dans l'onglet \"Mon compte\" de ton Dashboard.",
        'Attention, tous les tournois débutent à 10h, *il faudra donc être présent dès 9h00 pour un check-in de toutes les équipes et joueurs.*',
        {
          location: 'https://arena.utt.fr/dashboard/account',
          name: 'Accéder à arena.utt.fr',
        },
      ],
    },
    {
      title: 'Ce que tu dois emporter',
      components: [
        "Pour rentrer à l'UTT Arena, tu auras besoin de",
        [
          'ton *billet* (que tu trouveras en pièce jointe, ou sur le site)',
          "une *pièce d'identité* (type carte d'identité, titre de séjour ou permis de conduire)",
        ],
        "Nous te conseillons d'emporter également",
        [
          'Une gourde *vide*',
          "une multiprise puisque tu n'auras *qu'une seule prise mise à ta disposition pour brancher tout ton setup*",
          "un câble ethernet (d'environ 7m)",
          'ton setup',
        ],
        "Si tu as encore des questions, n'hésite pas à regarder notre FAQ ou à poser la question sur le serveur discord !",
        {
          location: 'https://arena.utt.fr/help',
          name: 'Ouvrir la FAQ',
        },
      ],
    },
  ],
  attachments: async (user) => {
    const cartItem = await database.cartItem.findFirst({
      where: {
        cart: {
          paidAt: {
            not: null,
          },
          transactionState: TransactionState.paid,
        },
        itemId: `ticket-${user.type}`,
        forUserId: user.id,
      },
      include: { item: true, forUser: true },
    });
    return [await generateTicket(cartItem)];
  },
};
