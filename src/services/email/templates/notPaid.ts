import { RawUser } from '../../../types';
import { serialize } from '..';

export const generateNotPaidEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    reason: 'Tu as reçu ce mail car tu as créé un compte sur arena.utt.fr',
    title: {
      banner: 'On se retrouve ce weekend !',
      highlight: `Salut ${user.firstname}`,
      short: "L'UTT Arena arrive à grands pas 🔥",
      topic: "Tu n'as pas encore payé",
    },
    receiver: user.email,
    sections: [
      {
        title: "Ton inscription n'a pas été confirmée",
        components: [
          "L'UTT Arena approche à grand pas, et ton inscription n'est pas encore confirmée. Pour verrouiller ta place, il ne te reste plus qu'à la payer en accédant à la boutique sur le site. \nSi le tournoi auquel tu souhaites participer est d'ores-et-déjà rempli, tu sera placé en file d'attente.",
          // "\n_Si le taux de remplissage d'un tournoi est trop faible d'ici à deux semaines de l'évènement, l'équipe organisatrice se réserve le droit de l'annuler._",
          {
            location: 'https://arena.utt.fr/dashboard/team',
            name: 'Accéder à arena.utt.fr',
          },
        ],
      },
    ],
    attachments: [],
  });
