import { RawUser } from '../../../types';
import { serialize } from '..';

export const generateNotPaidSSBUEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    reason: 'Tu as reçu ce mail car tu as créé un compte sur arena.utt.fr',
    title: {
      banner: 'On se retrouve ce weekend !',
      highlight: `Salut ${user.firstname}`,
      short: "L'UTT Arena arrive à grands pas 🔥",
      topic: "Ton ticket pour l'UTT Arena",
    },
    receiver: user.email,
    sections: [
      {
        title: "Ton inscription n'a pas été confirmée",
        components: [
          "L'UTT Arena approche à grand pas, et ton inscription pour le tournoi SSBU n'est pas encore confirmée. Pour verrouiller ta place, il ne te reste plus qu'à la payer en accédant à la boutique sur le site.",
          "\nN'oublie pas que tu peux décider de ramener ta propre Nintendo Switch avec SSBU (all DLCs) pour bénéficier d'une *réduction de 3€* sur ta place ! Cela permet également au tournoi de s'enchaîner de façon plus fluide.",
          "\nOn se retrouve le 1, 2, 3 décembre dans l'Arène !",
          {
            location: 'https://arena.utt.fr/dashboard/team',
            name: 'Accéder à arena.utt.fr',
          },
        ],
      },
    ],
    attachments: [],
  });
