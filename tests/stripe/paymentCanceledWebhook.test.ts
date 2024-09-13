import request from 'supertest';
import { TransactionState } from '@prisma/client';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as cartOperations from '../../src/operations/carts';
import database from '../../src/services/database';
import { Error, User, Cart } from '../../src/types';
import { createFakeUser, createFakeCart } from '../utils';
import { updateCart } from '../../src/operations/carts';
import { generateStripePaymentIntent, resetFakeStripeApi, StripePaymentIntent } from '../stripe';

describe('POST /stripe/canceled', () => {
  let user: User;
  let cart: Cart;
  let paymentIntent: StripePaymentIntent;

  before(async () => {
    user = await createFakeUser();
    cart = await createFakeCart({ userId: user.id, items: [] });
    paymentIntent = generateStripePaymentIntent(120);
    await updateCart(cart.id, { transactionId: paymentIntent.id, transactionState: TransactionState.processing });
  });

  after(async () => {
    await database.cart.deleteMany();
    await database.user.deleteMany();
    resetFakeStripeApi();
  });

  const generateCart = (transactionId: string) => ({
    object: 'event',
    type: 'payment_intent.canceled',
    // There are more fields that are sent by Stripe, we just put one more there to verify that other fields would be accepted, and not considered as a bad request.
    another_field_that_should_be_accepted: 'hello there :)',
    data: {
      object: {
        object: 'payment_intent',
        id: transactionId,
        // Same explanation as above.
        and_put_one_more_here: 3,
      },
    },
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(cartOperations, 'fetchCartFromTransactionId').throws('Unexpected error');
    await request(app)
      .post('/stripe/canceled')
      .send(generateCart('plz throw'))
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the transaction id does not exist', () =>
    request(app)
      .post('/stripe/canceled')
      .send(generateCart('I AM A H4X0R'))
      .expect(404, { error: Error.CartNotFound }));

  it('should fail as the request does not come from Stripe', () =>
    request(app)
      .post('/stripe/canceled')
      .send(generateCart(paymentIntent.id))
      .expect(401, { error: Error.PleaseDontPlayWithStripeWebhooks })); // Given status is succeeded, real status is requires_action.

  describe('test for initial transactionState = `processing` | `pending`', () => {
    for (const transactionState of [TransactionState.processing, TransactionState.pending]) {
      it(`should change the transactionState of the cart from ${transactionState} to \`canceled\``, async () => {
        paymentIntent.status = 'canceled';
        await updateCart(cart.id, { transactionState });
        await request(app).post('/stripe/canceled').send(generateCart(paymentIntent.id)).expect(200, { api: 'ok' });
        const databaseCart = await database.cart.findUnique({ where: { id: cart.id } });
        expect(databaseCart.transactionState).to.equal(TransactionState.canceled);
      });
    }
  });

  describe('test for initial transactionState = `paid` | `expired` | `refunded` | `canceled`', () => {
    for (const transactionState of [
      TransactionState.paid,
      TransactionState.expired,
      TransactionState.refunded,
      TransactionState.canceled,
    ]) {
      it(`should not change the transactionState of the cart as it already equals ${transactionState}`, async () => {
        await updateCart(cart.id, { transactionState });
        await request(app).post('/stripe/canceled').send(generateCart(paymentIntent.id)).expect(200, { api: 'ok' });
        const databaseCart = await database.cart.findUnique({ where: { id: cart.id } });
        expect(databaseCart.transactionState).to.equal(transactionState);
      });
    }
  });
});
