import axios from 'axios';
import { Contact } from '../types';
import { slackContactWebhook } from './environment';

export default ({ name, email, subject, message }: Contact) => {
  return axios.post(
    slackContactWebhook(),
    {
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
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );
};
