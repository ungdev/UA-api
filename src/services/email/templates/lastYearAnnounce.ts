import { serialize } from '..';
import env from '../../../utils/env';

export const generateLastYearPublicAnnounce = (email: string) =>
  serialize({
    receiver: email,
    reason:
      "Tu as reçu ce mail car tu as participé à l'UTT Arena en décembre 2023. Si ce n'est pas le cas, ignore ce message.",
    title: {
      topic: "L'UTT ARENA est de retour !",
      banner: '',
      short: `Salut,`,
      highlight: "L'UTT Arena est de retour !",
    },
    sections: [
      {
        title: "L'UTT Arena revient du 6 au 8 décembre à Troyes pour un nouveau tournoi League of Legends",
        components: [
          '🖥️ **160 places** joueurs à 28€',
          '🎙️ Casté par **Drako** et **Headen**',
          '💰 **2000€** de cashprize',
          '🚅 **Troyes** à 1h30 de Paris',
          '🎊 Buvette et animations tout le weekend',
        ],
      },
      {
        title: 'Inscriptions',
        components: [
          "Pour s'inscrire, ça se passe sur le site !",
          {
            name: "Inscris toi à l'UTT Arena 2024 !",
            location: `https://arena.utt.fr/`,
          },
          `_Si le bouton ne marche pas, tu peux utiliser ce lien:_\n_https://arena.utt.fr/_`,
        ],
      },
      {
        title: 'Des questions ?',
        components: [
          "On t'invite à lire la FAQ ou à poser tes questions directement sur Discord.",
          [
            {
              name: 'FAQ',
              location: `${env.front.website}/help`,
            },
            {
              name: 'Rejoindre le serveur Discord',
              location: 'https://discord.gg/WhxZwKU',
            },
          ],
        ],
      },
    ],
    attachments: [],
  });
