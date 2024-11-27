import { RawUser, ActionFeedback } from '../../../types';
import { serialize } from '..';
import env from '../../../utils/env';

export const generatePasswordResetEmail = (user: Omit<RawUser, 'permissions'>) =>
  serialize({
    receiver: user.email,
    reason:
      "Tu as reçu ce mail car tu as demandé à réinitialiser ton mot de passe. Si ce n'est pas le cas, ignore ce message.",
    title: {
      topic: 'Réinitialisation de ton mot de passe',
      banner: 'Réinitialisation du mot de passe',
      short: `Salut ${user.firstname},`,
      highlight: 'Tu es sur le point de réinitialiser ton mot de passe',
    },
    sections: [
      {
        title: 'Code de vérification',
        components: [
          "On doit s'assurer que tu es bien à l'origine de cette demande. Tu peux finaliser la procédure en cliquant sur le bouton ci-dessous.",
          {
            name: 'Réinitialise ton mot de passe',
            location: `${env.front.website}/${ActionFeedback.PASSWORD_RESET}/${user.resetToken}`,
          },
          `_Si le bouton ne marche pas, tu peux utiliser ce lien:_\n_${env.front.website}/${ActionFeedback.PASSWORD_RESET}/${user.resetToken}_`,
        ],
      },
    ],
    attachments: [],
  });
