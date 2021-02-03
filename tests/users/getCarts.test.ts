import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as cartOperations from '../../src/operations/carts';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/user';

describe('POST /users/:userId/carts', () => {
  let user: User;
  let token: string;

  before(async () => {
    user = await createFakeUser();
    token = generateToken(user);
  });

  after(async () => {
    // Delete the user created
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the user is not itself', async () => {
    const otherUser = await createFakeUser();
    const otherToken = generateToken(otherUser);

    await request(app)
      .get(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(cartOperations, 'fetchCarts').throws('Unexpected error');

    await request(app)
      .get(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return an empty cart', async () => {
    await request(app).get(`/users/${user.id}/carts`).set('Authorization', `Bearer ${token}`).expect(200, []);
  });

  it('should return a pending cart', async () => {
    await cartOperations.createCart(user.id, [
      {
        itemId: 'ethernet-5',
        quantity: 1,
        forUserId: user.id,
      },
    ]);

    const carts = await cartOperations.fetchCarts(user.id);
    const [cart] = carts;
    const [cartItem] = cart.cartItems;

    await request(app)
      .get(`/users/${user.id}/carts`)
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
              itemId: 'ethernet-5',
              forUserId: user.id,
            },
          ],
        },
      ]);
  });
});
