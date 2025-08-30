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
interface StripeProduct extends StripeObject {
  object: 'product';
  name: string;
  default_price: string | null;
}
interface StripePrice extends StripeObject {
  object: 'price';
  unit_amount: number;
  product: string;
}
interface StripeCoupon extends StripeObject {
  object: 'coupon';
  name: string;
  amount_off: number;
}
interface StripeSession extends StripeObject {
  object: 'checkout.session';
  client_secret: string;
  email: string;
  amount_total: number;
}
export interface StripePaymentIntent extends StripeObject {
  object: 'payment_intent';
  client_secret: string;
  amount: number;
  status: 'canceled' | 'processing' | 'succeeded' | 'requires_action';
}

export const stripeProducts: StripeProduct[] = [];
export const stripePrices: StripePrice[] = [];
export const stripeCoupons: StripeCoupon[] = [];
export const stripeSessions: StripeSession[] = [];
export const stripePaymentIntents: StripePaymentIntent[] = [];

// Bro whaattt ?? Stripe uses `application/x-www-form-urlencoded` to send data
// https://stackoverflow.com/questions/73534171/convert-an-x-www-form-urlencoded-string-to-json#answer-73534319
function decodeBody(body: string) {
  return [...new URLSearchParams(body)].reduce(
    (object, [key, value]) => {
      // The idea is the same as the algorithm given in the stackoverflow link above, but generalized.
      const keys = key.match(/[^[\]]+/g) as [string | number];
      let currentObject = object;
      for (let index = 0; index < keys.length - 1; index++) {
        if (currentObject[keys[index]] === undefined) {
          currentObject[keys[index]] = {};
        }
        currentObject = currentObject[keys[index]] as Record<string, unknown>;
      }
      const lastKey = keys.at(-1);
      if (lastKey !== undefined) {
        currentObject[lastKey] = value;
      }
      return object;
    },
    {} as Record<string, unknown>,
  );
}

function id(prefix: string) {
  return `${prefix}_${faker.string.alpha({ length: 16 })}`;
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

export function generateStripePrice(unit_amount: number, product: string) {
  const price: StripePrice = {
    id: id('price'),
    object: 'price',
    unit_amount,
    product,
  };
  stripePrices.push(price);
  return price;
}

export function generateStripeCoupon(name: string, amount_off: number) {
  const coupon: StripeCoupon = {
    id: id(''),
    object: 'coupon',
    name,
    amount_off,
  };
  stripeCoupons.push(coupon);
  return coupon;
}

export function generateStripeSession(email: string, amount: number) {
  const session: StripeSession = {
    id: id('cs'),
    object: 'checkout.session',
    client_secret: id(''),
    email,
    amount_total: amount,
  };
  stripeSessions.push(session);
  return session;
}

export function generateStripePaymentIntent(amount: number) {
  const paymentIntentId = id('pi');
  const paymentIntent: StripePaymentIntent = {
    id: paymentIntentId,
    object: 'payment_intent',
    client_secret: `${paymentIntentId}_${id('secret')}`,
    amount,
    status: 'requires_action',
  };
  stripePaymentIntents.push(paymentIntent);
  return paymentIntent;
}

function listen() {
  axios.defaults.adapter = 'http';
  nock('https://api.stripe.com/v1')
    .persist()

    // Get all products (paginated)
    // This can only happen in tests, it cannot be used to make ReDoS attacks

    .get(/\/products(\?((((starting_after=[^&]*)|(limit=\d+)|(active=true))&?)+))?$/)
    .reply((uri) => {
      const limitString = uri.match(/limit=(\d+)/)?.[1];
      const parsedLimit = limitString === undefined ? Number.NaN : Number.parseInt(limitString, 10);
      const limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
      const starting_after = uri.match(/starting_after=([^&]+)/)?.[1];
      const fromIndex = starting_after ? stripeProducts.findIndex((product) => product.id === starting_after) : 0;
      const toIndex = fromIndex + limit;
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
      if (body.default_price_data.currency !== 'eur') {
        return [500, { error: '`default_price_data.currency` should be `eur`' }];
      }
      if (Number.parseInt(body.default_price_data.unit_amount) < 0) {
        return [500, { error: 'price is negative' }];
      }
      if (body.name.length > 40) {
        return [500, { error: '`name` is greater than 40 characters' }];
      }
      const product = generateStripeProduct(body.name);
      const price = generateStripePrice(Number.parseInt(body.default_price_data.unit_amount), product.id);
      product.default_price = price.id;
      return [200, product];
    })

    // Modify a product
    .post(/\/products\/.+$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as { default_price?: string; active?: boolean; name?: string };
      const productId = uri.slice(uri.indexOf('/', 4) + 1);
      const productIndex = stripeProducts.findIndex((pProduct) => pProduct.id === productId);
      if (productIndex === -1) {
        return [500, { error: 'Product not found' }];
      }
      if (body.active === false) {
        return [200, stripePrices.slice(productIndex, 1)[0]];
      }
      if (body.default_price) {
        if (!stripePrices.some((price) => price.id === body.default_price && price.product === productId)) {
          return [500, { error: 'Price default_price not found or not bound to product' }];
        }
        stripeProducts[productIndex].default_price = body.default_price;
      }
      if (body.name) {
        if (body.name.length > 40) return [500, { error: '`name` is greater than 40 characters' }];
        stripeProducts[productIndex].name = body.name;
      }
      return [200, stripeProducts[productIndex]];
    })

    // Get all prices (paginated)
    // This can only happen in tests, it cannot be used to make ReDoS attacks

    .get(/\/prices(\?((starting_after=[^&]*)|(limit=\d+))+&?)?$/)
    .reply((uri) => {
      const limitString = uri.match(/limit=(\d+)/)?.[1];
      const parsedLimit = limitString === undefined ? Number.NaN : Number.parseInt(limitString, 10);
      const limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
      const starting_after = uri.match(/starting_after=([^&]+)/)?.[1];
      const fromIndex = starting_after ? stripePrices.findIndex((price) => price.id === starting_after) : 0;
      const toIndex = fromIndex + limit;
      return [200, { has_more: toIndex < stripePrices.length, data: stripePrices.slice(fromIndex, toIndex) }];
    })

    // Create a price
    .post(/\/prices$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as { product: string; currency: string; unit_amount: string };
      if (!stripeProducts.some((product) => product.id === body.product)) {
        return [500, { error: 'Product not found' }];
      }
      if (body.currency !== 'eur') {
        return [500, { error: '`currency` should be `eur`' }];
      }
      if (Number.parseInt(body.unit_amount) < 0) {
        return [500, { error: 'price is negative' }];
      }
      return [200, generateStripePrice(Number.parseInt(body.unit_amount), body.product)];
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

    // Get all coupons (paginated)
    // This can only happen in tests, it cannot be used to make ReDoS attacks

    .get(/\/coupons(\?((starting_after=[^&]*)|(limit=\d+))+&?)?$/)
    .reply((uri) => {
      const limitString = uri.match(/limit=(\d+)/)?.[1];
      const parsedLimit = limitString === undefined ? Number.NaN : Number.parseInt(limitString, 10);
      const limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
      const starting_after = uri.match(/starting_after=([^&]+)/)?.[1];
      const fromIndex = starting_after ? stripeCoupons.findIndex((coupon) => coupon.id === starting_after) : 0;
      const toIndex = fromIndex + limit;
      return [200, { has_more: toIndex < stripeCoupons.length, data: stripeCoupons.slice(fromIndex, toIndex) }];
    })

    // Create a price
    .post(/\/coupons$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as { name: string; currency: string; amount_off: string };
      if (body.currency !== 'eur') {
        return [500, { error: '`currency` should be `eur`' }];
      }
      if (Number.parseInt(body.amount_off) < 0) {
        return [500, { error: '`amount_off` is negative' }];
      }
      return [200, generateStripeCoupon(body.name, Number.parseInt(body.amount_off))];
    })

    // Modify a price (only used for deletion)
    .post(/\/coupons\/.+$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as { name: string };
      const couponId = uri.slice(uri.indexOf('/', 4) + 1);
      const couponIndex = stripeCoupons.findIndex((coupon) => coupon.id === couponId);
      if (couponIndex === -1) {
        return [500, { error: 'Price not found' }];
      }
      stripeCoupons[couponIndex].name = body.name;
      return [200, stripeCoupons[couponIndex]];
    })

    // Delete a product
    .delete(/\/coupons\/.+$/)
    .reply((uri) => {
      const couponId = uri.slice(uri.indexOf('/', 4) + 1);
      const couponIndex = stripeCoupons.findIndex((coupon) => coupon.id === couponId);
      if (couponIndex === -1) {
        return [500, { error: 'Product not found' }];
      }
      if (stripePrices.some((price) => price.product === couponId)) {
        return [500, { error: 'Prices still bound' }];
      }
      return [200, stripeProducts.splice(couponIndex, 1)[0]];
    })

    // Create a checkout session
    .post(/\/checkout\/sessions$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as {
        mode: string;
        ui_mode: string;
        return_url: string;
        line_items: { [key: number]: { price: string; quantity: number } }; // Basically an array
        expires_at: string;
        customer_email: string;
        discounts: { [key: number]: { coupon: string } }; // Another array
      };
      if (body.mode !== 'payment') return [500, { error: 'Mode is not `payment`' }];
      if (body.ui_mode !== 'embedded') return [500, { error: 'ui_mode is not `embedded`' }];
      if (body.return_url !== env.stripe.callback)
        return [500, { error: `return_url is not \`${env.stripe.callback}\`` }];
      if (Date.parse(body.expires_at) < Date.now()) return [500, { error: '`expires_at` has already expired' }];
      const discounts = Object.values(body.discounts ?? {});
      if (discounts.length > 1) return [500, { error: "Can't apply more than 1 discount" }];
      const totalDiscount =
        discounts.length === 1 ? stripeCoupons.find((coupons) => coupons.id === discounts[0].coupon)!.amount_off : 0;
      return [
        200,
        generateStripeSession(
          body.customer_email ?? '',
          Object.values(body.line_items).reduce(
            (previous, current) =>
              (stripePrices.find((price) => price.id === current.price)?.unit_amount ?? 0) * current.quantity +
              previous,
            0,
          ) - totalDiscount,
        ),
      ];
    })

    .get(/payment_intents\/.*$/)
    .reply((uri) => {
      const paymentIntentId = uri.slice(uri.indexOf('/', 4) + 1);
      const paymentIntent = stripePaymentIntents.find((pi) => pi.id === paymentIntentId);
      if (!paymentIntent) {
        return [500, 'Payment intent was not found'];
      }
      return [200, paymentIntent];
    })

    .post(/\/payment_intents$/)
    .reply((uri, pBody) => {
      const body = decodeBody(pBody as string) as {
        currency: string;
        amount: string;
      };
      if (body.currency !== 'eur') return [500, '`currency` must be `eur`'];
      const amount = Number(body.amount);
      if (amount <= 0) {
        return [500, 'Price is negative'];
      }
      return [200, generateStripePaymentIntent(amount)];
    })

    .post(/\/payment_intents\/.*\/cancel$/)
    .reply((uri) => {
      const match = uri.match(/payment_intents\/(.*)\/cancel$/);
      if (!match) {
        return [500, 'Invalid payment intent cancel URI'];
      }
      const paymentIntentId = match[1];
      const paymentIntentIndex = stripePaymentIntents.findIndex((pi) => pi.id === paymentIntentId);
      if (!paymentIntentIndex) {
        return [500, 'Payment intent was not found'];
      }
      return [200, stripePaymentIntents.splice(paymentIntentIndex, 1)[0]];
    });
}

/**
 * Resets the fake stripe API. **It does not disable the fake Stripe api !**
 * Deletes all registered {@link StripeProduct} and {@link StripeSession}.
 * @see disableFakeStripeApi to see how to disable the fake discord api
 */
export const resetFakeStripeApi = () => {
  stripeProducts.splice(0);
  stripePrices.splice(0);
  stripeCoupons.splice(0);
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
