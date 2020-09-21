import axios from 'axios';
import { Contact } from '../types';
import { slackContactWeebhook } from './environment';

export default ({ firstname, lastname, email, subject, message }: Contact) => {
  return axios.post(
    slackContactWeebhook(),
    {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• De *${firstname} ${lastname}*\n• Email : ${email}\n• Sujet : ${subject}`,
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
