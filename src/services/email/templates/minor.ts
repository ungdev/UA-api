import { RawUser } from '../../../types';
import { serialize } from '..';

export const generateMinorEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    reason: 'Tu as reçu ce mail car tu as créé un compte sur arena.utt.fr',
    title: {
      banner: 'On se retrouve ce weekend !',
      highlight: `Salut ${user.firstname}`,
      short: "L'UTT Arena arrive à grands pas 🔥",
      topic: "N'oublie pas ton autorisation parentale",
    },
    receiver: user.email,
    sections: [
      {
        title: 'Autorisation parentale',
        components: [
          "Tu nous as indiqué que tu seras mineur à la date de l'UTT Arena. N'oublie pas de préparer *ton autorisation parentale, et une photocopie de ta pièce d'identité, et de celle de ton responsable légal* !",
          "La vérification se fera à l'entrée de l'UTT Arena, n'hésite pas à envoyer à l'avance ces documents par mail à arena@utt.fr pour simplifier la procédure à l'entrée.",
          {
            location: 'https://arena.utt.fr/uploads/files/Autorisation_parentale_-_UTT_Arena_2024.pdf',
            name: "Télécharger l'autorisation parentale",
          },
        ],
      },
    ],
    attachments: [],
  });
