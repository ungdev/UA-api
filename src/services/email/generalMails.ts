import { MailGeneral } from '.';
import { getNextPaidAndValidatedUserBatch } from '../../operations/user';
import { getMinorUsers, getNotOnDiscordServerUsers, getNotPaidSsbuUsers, getNotPaidUsers } from './targets';

export const availableGeneralMails: {
  [key: string]: MailGeneral;
} = {
  joindiscord: {
    targets: getNotOnDiscordServerUsers,
    template: 'joindiscord',
  },
  minor: {
    targets: getMinorUsers,
    template: 'minor',
  },
  notpaid: {
    targets: getNotPaidUsers,
    template: 'notpaid',
  },
  notpaidssbu: {
    targets: getNotPaidSsbuUsers,
    template: 'notpaidssbu',
  },
  tickets: {
    targets: getNextPaidAndValidatedUserBatch,
    template: 'tickets',
  },
};
