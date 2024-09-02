import axios from 'axios';
import nock from 'nock';
import { faker } from '@faker-js/faker';
import env from '../src/utils/env';

interface StripeObject {
  id: string;
  object: string;
}
interface StripeItem {}
interface StripeSession extends StripeObject {
  object: 'checkout.session';
  client_secret: string;
}

const items: StripeItem[] = [];
const sessions: StripeSession[] = [];

function id(prefix: string) {
  return `${prefix}_${faker.string.alpha({ length: 16 })}`;
}

function listen() {
  axios.defaults.adapter = 'http';
  nock('https://api.stripe.com/')
    .persist()

    // Get GuildMember https://discord.com/developers/docs/resources/guild#get-guild-member
    .post(/\/v1\/checkout\/sessions/)
    .reply(() => {
      const session: StripeSession = {
        id: id('cs'),
        object: 'checkout.session',
        client_secret: id(''),
      };
      sessions.push(session);
      return session;
    });
}

/**
 * Resets the fake stripe API. **It does not disable the fake Stripe api !**
 * Deletes all registered {@link StripeItem} and {@link StripeSession}.
 * @see disableFakeStripeApi to see how to disable the fake discord api
 */
export const resetFakeStripeApi = () => {
  items.splice(0);
  sessions.splice(0);
};

/**
 * Starts the 'fake stripe api'.
 * Generates a fake Stripe token.
 */
export const enableFakeStripeApi = () => {
  env.stripe.token = id('pk');
  listen();
};

/**
 * Stops the 'fake stripe api'.
 * Removes all interceptors and clears environment variables set by {@link enableFakeStripeApi}.
 * @see resetFakeStripeApi to clear data from the fake Stripe API.
 */
export const disableFakeStripeApi = () => {
  env.stripe.token = undefined;
  nock.cleanAll();
};
