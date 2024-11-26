import { RawUser, ActionFeedback } from '../../../types';
import { serialize } from '..';
import env from '../../../utils/env';

export const generateAccountValidationEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    receiver: user.email,
    reason:
      "Tu as reçu ce mail car tu as envoyé une demande de création de compte à l'UTT Arena. Si ce n'est pas toi, ignore ce message ou contacte-nous.",
    title: {
      topic: 'Code de validation',
      banner: 'Création du compte',
      short: `Salut ${user.firstname},`,
      highlight: "Bienvenue à l'UTT Arena&nbsp;!",
    },
    sections: [
      {
        title: 'Avant de commencer...',
        components: [
          "On sait bien que c'est pénible mais on doit vérifier que ton adresse email fonctionne bien (sinon tu ne pourras pas recevoir tes billets&nbsp;!).",
          {
            name: 'Confirme ton adresse email',
            location: `${env.front.website}/${ActionFeedback.VALIDATE}/${user.registerToken}`,
          },
          `_Si le bouton ne marche pas, tu peux utiliser ce lien:_\n_${env.front.website}/${ActionFeedback.VALIDATE}/${user.registerToken}_`,
        ],
      },
      {
        title: 'Discord',
        components: [
          "On utilise Discord pendant l'évènement, et tu auras besoin de lier ton compte discord avec ton compte UTT Arena pour pouvoir créer ou rejoindre une équipe. On te donnera plus de détails là-dessus à ce moment-là 😉",
        ],
      },
      {
        title: 'Tournoi Super Smash Bros Ultimate',
        components: [
          "Si tu as choisi de t'inscrire à ce tournoi et que tu choisis de venir avec ta propre console, tu peux bénéficier d'une réduction sur ton billet 😉 _(offre limitée à un certain nombre de places)_",
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
