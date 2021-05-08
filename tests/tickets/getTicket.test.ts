import { TransactionState } from '@prisma/client';
import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as cartItemOperations from '../../src/operations/cartItem';
import database from '../../src/services/database';
import { CartItem, Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { createCart, fetchCarts, updateCart } from '../../src/operations/carts';

describe('POST /users/:userId/carts', () => {
  let user: User;
  let token: string;
  let ticket: CartItem;
  let supplement: CartItem;

  before(async () => {
    user = await createFakeUser();
    token = generateToken(user);

    // Create a ticket and a supplement
    await createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        forUserId: user.id,
      },
      {
        itemId: 'ethernet-5',
        quantity: 1,
        forUserId: user.id,
      },
    ]);

    // Retreive the ticket and the supplement
    const carts = await fetchCarts(user.id);
    const [cart] = carts;

    ticket = cart.cartItems.find((cartItem) => cartItem.itemId === 'ticket-player');
    supplement = cart.cartItems.find((cartItem) => cartItem.itemId === 'ethernet-5');
  });

  after(async () => {
    // Delete the user created
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });
  it("should fail because cart item doesn't belong to the user", async () => {
    const otherUser = await createFakeUser();
    const otherToken = generateToken(otherUser);

    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it("should fail because the cartItem doesn't exists", async () => {
    await request(app)
      .get(`/tickets/A1B2C3`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TicketNotFound });
  });

  it('should fail because the cartItem is not in the ticket category', async () => {
    await request(app)
      .get(`/tickets/${supplement.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TicketNotFound });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(cartItemOperations, 'fetchCartItem').throws('Unexpected error');

    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail because the cart associated to the ticket is not paid', async () => {
    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotPaid });
  });

  it('shoud successfuly get the pdf', async () => {
    // Pay the cart
    await updateCart(ticket.cartId, 123, TransactionState.paid);

    const { body } = await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect('Content-Type', 'application/pdf; charset=utf-8')
      .expect(200);

    expect(Buffer.isBuffer(body)).to.be.true;
  });
});
