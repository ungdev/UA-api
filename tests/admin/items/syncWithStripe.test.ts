import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Item, Permission, User, UserType } from '../../../src/types';
import { generateToken } from '../../../src/utils/users';
import { fetchAllItems, updateAdminItem } from '../../../src/operations/item';
import {
  generateStripePrice,
  generateStripeProduct,
  resetFakeStripeApi,
  stripePrices,
  stripeProducts,
} from '../../stripe';

describe('PATCH /admin/items/stripe-sync', () => {
  let user: User;
  let admin: User;
  let items: Item[];
  let adminToken: string;

  before(async () => {
    items = await fetchAllItems();
    user = await createFakeUser({ type: UserType.player });
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch('/admin/items/stripe-sync').expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .patch('/admin/items/stripe-sync')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should successfully synchronize with Stripe', async () => {
    resetFakeStripeApi();
    // Existing item, price sync-ed and wrong reduced price
    let item = items.find((pItem) => pItem.id === 'ticket-player');
    let product = generateStripeProduct(item.name);
    let price = generateStripePrice('eur', item.price, product.id);
    product.default_price = price.id;
    let reducedPrice = generateStripePrice('eur', item.reducedPrice - 1, product.id);
    await updateAdminItem('ticket-player', {
      stripeProductId: product.id,
      stripePriceId: price.id,
      stripeReducedPriceId: reducedPrice.id,
    });
    // Existing item, unbound price but sync-ed reduced price, and a random other price cause why not
    item = items.find((pItem) => pItem.id === 'ticket-player-ssbu');
    product = generateStripeProduct(item.name);
    price = generateStripePrice('eur', item.price, product.id);
    product.default_price = price.id;
    reducedPrice = generateStripePrice('eur', item.reducedPrice, product.id);
    generateStripePrice('eur', item.price + 1, product.id);
    await updateAdminItem('ticket-player-ssbu', { stripeProductId: product.id, stripeReducedPriceId: reducedPrice.id });
    // Unexisting item
    product = generateStripeProduct('canard caché');
    price = generateStripePrice('eur', 666, product.id);
    product.default_price = price.id;
    await request(app).patch('/admin/items/stripe-sync').set('Authorization', `Bearer ${adminToken}`).expect(204);

    items = await fetchAllItems();
    let priceCount = 0;
    for (item of items) {
      priceCount++;
      product = stripeProducts.find((pProduct) => pProduct.id === item.stripeProductId);
      price = stripePrices.find((pPrice) => pPrice.id === item.stripePriceId);
      expect(product).to.not.be.undefined;
      expect(price).to.not.be.undefined;
      expect(price.product).to.be.equal(product.id);
      expect(price.currency).to.be.equal('eur');
      expect(price.unit_amount).to.be.equal(item.price);
      expect(product.default_price).to.be.equal(price.id);
      if (item.reducedPrice !== null) {
        priceCount++;
        reducedPrice = stripePrices.find((pPrice) => pPrice.id === item.stripeReducedPriceId);
        expect(reducedPrice).to.not.be.undefined;
        expect(reducedPrice.product).to.be.equal(product.id);
      }
    }
    expect(stripePrices).to.have.length(priceCount);
    expect(stripeProducts).to.have.length(items.length);

    // Roll-back changes
    for (item of items) {
      await updateAdminItem(item.id, {
        stripeProductId: null,
        stripePriceId: null,
        stripeReducedPriceId: null,
      });
    }
  });
});
