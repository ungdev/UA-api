import { WebClient } from '@slack/web-api';
import { Contact } from '../types';
import env from '../utils/env';

const slack = new WebClient(env.slack.token);

/**
 * Sends a Slack message contact
 */
export const sendSlackContact = ({ name, email, subject, message }: Contact) =>
  slack.chat.postMessage({
    channel: env.slack.contactChannel,
    text: message,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• De *${name}*\n• Email : ${email}\n• Sujet : ${subject}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: message,
        },
      },
    ],
    username: 'UTT Arena - Contact',
  });
