import axios from 'axios';
import { Contact, ObjectType } from '../types';
import { slackContactChannel } from './environment';

export const sendSlackMessage = (channel: string, text: string, blocks?: Array<ObjectType>, username?: string) =>
  axios.post(
    'https://slack.com/api/chat.postMessage',
    {
      channel,
      text,
      blocks,
      username,
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );

export const sendContactMessage = ({ name, email, subject, message }: Contact) => {
  return sendSlackMessage(
    slackContactChannel(),
    message,
    [
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
    'UTT Arena - Contact',
  );
};
