// We don't really have the control over the name of the fields :(
/* eslint-disable camelcase */
import axios from 'axios';
import nock from 'nock';
import { faker } from '@faker-js/faker';
import env from '../src/utils/env';

interface StripeObject {
  id: string;
  object: string;
}
interface StripeSession extends StripeObject {
  object: 'checkout.session';
  client_secret: string;
}
interface StripeProduct extends StripeObject {
  object: 'product';
  name: string;
  default_price: string | null;
}
interface StripePrice extends StripeObject {
  object: 'price';
  currency: string;
  unit_amount: number;
  product: string;
}

export const stripeSessions: StripeSession[] = [];
export const stripeProducts: StripeProduct[] = [];
export const stripePrices: StripePrice[] = [];

// Bro whaattt ?? Stripe uses `application/x-www-form-urlencoded` to send data
// https://stackoverflow.com/questions/73534171/convert-an-x-www-form-urlencoded-string-to-json#answer-73534319
function decodeBody(body: string) {
  return [...new URLSearchParams(body)].reduce(
    (object, [key, value]) => {
      const [name, sub] = key.match(/[^[\]]+/g);
      if (!sub) {
        // eslint-disable-next-line no-param-reassign
        object[name] = value;
      } else if (object[name]) {
        // eslint-disable-next-line no-param-reassign
        (object[name] as Record<string, unknown>)[sub] = value;
      } else {
        // eslint-disable-next-line no-param-reassign
        object[name] = { [sub]: value };
      }
      return object;
    },
    {} as Record<string, unknown>,
  );
}

function id(prefix: string) {
  return `${prefix}_${faker.string.alpha({ length: 16 })}`;
}

export function generateStripeSession() {
  const session: StripeSession = {
    id: id('cs'),
    object: 'checkout.session',
    client_secret: id(''),
  };
  stripeSessions.push(session);
  return session;
}

export function generateStripeProduct(name: string) {
  const product: StripeProduct = {
    id: id('prod'),
    object: 'product',
    name,
    default_price: null,
  };
  stripeProducts.push(product);
  return product;
}

export function generateStripePrice(currency: string, unit_amount: number, product: string) {
  const price: StripePrice = {
    id: id('price'),
    object: 'price',
    currency,
    unit_amount,
    product,
  };
  stripePrices.push(price);
  return price;
}

function listen() {
  axios.defaults.adapter = 'http';
  nock('https://api.stripe.com/v1')
    .persist()

    // Get all products (paginated)
    .get(/\/products(\?((starting_after=[^&]*)|(limit=\d+))+&?)?$/)
    .reply((uri) => {
      const limit = Number.parseInt(uri.match(/limit=(\d+)/)?.[1]);
      const starting_after = uri.match(/starting_after=([^&]+)/)?.[1];
      const fromIndex = starting_after ? stripeProducts.findIndex((product) => product.id === starting_after) : 0;
      const toIndex = fromIndex + (limit ?? 10);
      return [200, { has_more: toIndex < stripeProducts.length, data: stripeProducts.slice(fromIndex, toIndex) }];
    })

    // Create a product (and a default price)
    .post(/\/products$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as {
        name: string;
        default_price_data: {
          currency: string;
          unit_amount: string;
        };
      };
      const product = generateStripeProduct(body.name);
      const price = generateStripePrice(
        body.default_price_data.currency,
        Number.parseInt(body.default_price_data.unit_amount),
        product.id,
      );
      product.default_price = price.id;
      return [200, product];
    })

    // Modify a product
    .post(/\/products\/.+$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as { default_price?: string };
      const productId = uri.slice(uri.indexOf('/', 4) + 1);
      const product = stripeProducts.find((pProduct) => pProduct.id === productId);
      if (!product) {
        return [500, { error: 'Product not found' }];
      }
      if (body.default_price) {
        if (!stripePrices.some((price) => price.id === body.default_price && price.product === productId)) {
          return [500, { error: 'Price default_price not found or not bound to product' }];
        }
        product.default_price = body.default_price;
      }
      return [200, product];
    })

    // Delete a product
    .delete(/\/products\/.+$/)
    .reply((uri) => {
      const productId = uri.slice(uri.indexOf('/', 4) + 1);
      const productIndex = stripeProducts.findIndex((product) => product.id === productId);
      if (productIndex === -1) {
        return [500, { error: 'Product not found' }];
      }
      if (stripePrices.some((price) => price.product === productId)) {
        return [500, { error: 'Prices still bound' }];
      }
      return [200, stripeProducts.splice(productIndex, 1)[0]];
    })

    // Get all prices (paginated)
    .get(/\/prices(\?((starting_after=[^&]*)|(limit=\d+))+&?)?$/)
    .reply((uri) => {
      const limit = Number.parseInt(uri.match(/limit=(\d+)/)?.[1]);
      const starting_after = uri.match(/starting_after=([^&]+)/)?.[1];
      const fromIndex = starting_after ? stripePrices.findIndex((price) => price.id === starting_after) : 0;
      const toIndex = fromIndex + (limit ?? 10);
      return [200, { has_more: toIndex < stripePrices.length, data: stripePrices.slice(fromIndex, toIndex) }];
    })

    // Create a price
    .post(/\/prices$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as { product: string; currency: string; unit_amount: string };
      if (!stripeProducts.some((product) => product.id === body.product)) {
        return [500, { error: 'Product not found' }];
      }
      return [200, generateStripePrice(body.currency, Number.parseInt(body.unit_amount), body.product)];
    })

    // Modify a price (only used for deletion)
    .post(/\/prices\/.+$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as { active?: 'true' | 'false' };
      const priceId = uri.slice(uri.indexOf('/', 4) + 1);
      const priceIndex = stripePrices.findIndex((price) => price.id === priceId);
      if (priceIndex === -1) {
        return [500, { error: 'Price not found' }];
      }
      if (body.active === 'false') {
        return [200, stripePrices.splice(priceIndex, 1)[0]];
      }
      return [500, { error: 'Not understood' }];
    })

    // Create a checkout session
    .post(/\/checkout\/sessions$/)
    .reply(() => [200, generateStripeSession()]);
}

/**
 * Resets the fake stripe API. **It does not disable the fake Stripe api !**
 * Deletes all registered {@link StripeProduct} and {@link StripeSession}.
 * @see disableFakeStripeApi to see how to disable the fake discord api
 */
export const resetFakeStripeApi = () => {
  stripeProducts.splice(0);
  stripeSessions.splice(0);
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
