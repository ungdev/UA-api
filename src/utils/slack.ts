import qs from 'querystring';
import axios from 'axios';
import { Contact, ObjectType } from '../types';
import { slackContactChannel, slackToken } from './environment';

/**
 * Sends a message a the slack bot
 */
export const sendSlack = (channel: string, text: string, blocks?: Array<ObjectType>, username?: string) =>
  axios.post(
    'https://slack.com/api/chat.postMessage',
    qs.stringify({
      token: slackToken(),
      channel,
      text,
      blocks: JSON.stringify(blocks),
      username,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded/json; charset=utf-8' },
    },
  );

/**
 * Sends a Slack message contact
 */
export const sendSlackContact = ({ name, email, subject, message }: Contact) => {
  return sendSlack(
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
