import { RawUser } from '../../../types';
import { serialize } from '..';

export const generateJoinDiscordEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    reason: 'Tu as reçu ce mail car tu as créé un compte sur arena.utt.fr',
    title: {
      banner: 'On se retrouve ce weekend !',
      highlight: `Salut ${user.firstname}`,
      short: "L'UTT Arena arrive à grands pas 🔥",
      topic: 'Rejoins le discord',
    },
    receiver: user.email,
    sections: [
      {
        title: "Rejoins le serveur discord de l'UTT Arena !",
        components: [
          "Tu n'es pas encore sur le serveur discord Arena, nous te conseillons fortement de le rejoindre car il s'agit de notre principal outil de communication avec toi et les autres joueurs.",
          'Sur ce serveur, tu pourras également y discuter avec les autres joueurs, ou poser des questions aux organisateurs de ton tournoi.',
          {
            name: 'Rejoindre le serveur Discord',
            location: 'https://discord.gg/WhxZwKU',
          },
        ],
      },
    ],
    attachments: [],
  });
