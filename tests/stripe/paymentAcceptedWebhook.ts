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

describe('POST /stripe/accepted', () => {
  let user: User;
  let cart: Cart;

  before(async () => {
    user = await createFakeUser();
    cart = await createFakeCart({ userId: user.id, items: [] });
  });

  after(async () => {
    await database.user.deleteMany();
    await database.cart.deleteMany();
  });

  const generateCart = (transactionId: string) => ({
    object: 'event',
    type: 'checkout.session.accepted',
    data: {
      object: {
        object: 'checkout.session',
        id: transactionId,
      },
    },
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(cartOperations, 'fetchCartFromTransactionId').throws('Unexpected error');
    await request(app).post('/stripe/accepted').send(generateCart('plz throw')).expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the transaction id does not exist', () =>
    request(app).post('/stripe/accepted').send(generateCart('I AM A H4X0R')).expect(404, { error: Error.CartNotFound }));

  it('should change the transactionState of the cart from pending to paid', async () => {
    await updateCart(cart.id, 'supersecret', TransactionState.pending);
    await request(app).post('/stripe/accepted').send(generateCart('supersecret')).expect(200, { api: 'ok' });
    const databaseCart = await database.cart.findUnique({ where: { id: cart.id } });
    expect(databaseCart.transactionState).to.equal(TransactionState.paid);
  });

  describe('test for initial transactionState = `paid` | `expired` | `refunded`', () => {
    for (const transactionState of [TransactionState.paid, TransactionState.expired, TransactionState.refunded]) {
      it(`should not change the transactionState of the cart as it already equals ${transactionState}`, async () => {
        await updateCart(cart.id, 'supersecret', transactionState);
        await request(app).post('/stripe/expired').send(generateCart('supersecret')).expect(200, { api: 'ok' });
        const databaseCart = await database.cart.findUnique({ where: { id: cart.id } });
        expect(databaseCart.transactionState).to.equal(transactionState);
      });
    }
  });
});
