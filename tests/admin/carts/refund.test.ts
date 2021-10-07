import request from 'supertest';
import { TransactionState } from '@prisma/client';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Cart, Error, Permission, User } from '../../../src/types';
import * as cartOperations from '../../../src/operations/carts';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';

describe('POST /admin/carts/:cartId/refund', () => {
  let user: User;
  let admin: User;
  let adminToken: string;
  let cart: Cart;

  before(async () => {
    user = await createFakeUser();
    admin = await createFakeUser({ permission: Permission.admin });
    adminToken = generateToken(admin);

    cart = await cartOperations.createCart(user.id, [{ itemId: 'ticket-player', quantity: 1, forUserId: user.id }]);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/carts/${cart.id}/refund`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .post(`/admin/carts/${cart.id}/refund`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the cart is not found', () =>
    request(app)
      .post('/admin/carts/A12B3C/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.CartNotFound }));

  it('should error because the cart is not yet payed', () =>
    request(app)
      .post(`/admin/carts/${cart.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.NotPaid }));

  it('should throw an internal server error', async () => {
    await database.cart.update({
      data: { transactionState: TransactionState.paid },
      where: { id: cart.id },
    });
    // Fake the main function to throw
    sandbox.stub(cartOperations, 'refundCart').throws('Unexpected error');

    // Request to login
    await request(app)
      .post(`/admin/carts/${cart.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should refund the cart', async () => {
    await database.cart.update({
      data: { transactionState: TransactionState.paid },
      where: { id: cart.id },
    });

    return request(app).post(`/admin/carts/${cart.id}/refund`).set('Authorization', `Bearer ${adminToken}`).expect(204);
  });
});
