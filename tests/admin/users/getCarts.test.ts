import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User } from '../../../src/types';
import * as cartOperations from '../../../src/operations/carts';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/user';

describe.only('GET /admin/users/:userId/carts', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    user = await createFakeUser();
    admin = await createFakeUser({ permission: Permission.admin });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.log.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/users/${user.id}/carts`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .get(`/admin/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not found', () =>
    request(app)
      .get('/admin/users/A12B3C/carts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound }));

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(cartOperations, 'fetchCarts').throws('Unexpected error');

    await request(app)
      .get(`/admin/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return an empty cart', () =>
    request(app).get(`/admin/users/${user.id}/carts`).set('Authorization', `Bearer ${adminToken}`).expect(200, []));

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
      .get(`/admin/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${adminToken}`)
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
