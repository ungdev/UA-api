import request from 'supertest';
import { UserType } from '@prisma/client';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as cartOperations from '../../src/operations/carts';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { fetchAllItems } from '../../src/operations/item';
import { expect } from 'chai';

describe('GET /users/current/carts', () => {
  let user: User;
  let token: string;

  before(async () => {
    user = await createFakeUser({ type: UserType.player });
    token = generateToken(user);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the user is not authenticated', async () => {
    await request(app).get(`/users/current/carts`).expect(401, { error: Error.Unauthenticated });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(cartOperations, 'fetchCarts').throws('Unexpected error');

    await request(app)
      .get(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return an empty cart', async () => {
    await request(app).get(`/users/current/carts`).set('Authorization', `Bearer ${token}`).expect(200, []);
  });

  it('should return a cart with an attendant', async () => {
    await cartOperations.createCart(user.id, [
      {
        itemId: 'ticket-attendant',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-attendant')!.price,
        forUserId: user.id,
      },
    ]);

    const result = await request(app)
      .get(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(result.body).to.have.lengthOf(1);
    expect(result.body[0].cartItems[0].forUser.username).to.equal(`${user.firstname} ${user.lastname}`);

    await database.cart.deleteMany();
  });

  it('should return a pending cart', async () => {
    await cartOperations.createCart(user.id, [
      {
        itemId: 'ethernet-7',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ethernet-7')!.price,
        forUserId: user.id,
      },
    ]);

    const carts = await cartOperations.fetchCarts(user.id);
    const [cart] = carts;
    const [cartItem] = cart.cartItems;

    await request(app)
      .get(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200, [
        {
          id: cart.id,
          userId: user.id,
          transactionState: cart.transactionState,
          paidAt: null,
          transactionId: null,
          cartItems: [
            {
              id: cartItem.id,
              quantity: 1,
              cartId: cart.id,
              itemId: 'ethernet-7',
              price: 1000,
              reducedPrice: null,
              forcePaid: false,
              forUser: {
                id: user.id,
                username: user.username,
              },
            },
          ],
        },
      ]);
  });
});
