import request from 'supertest';
import { TransactionState } from '@prisma/client';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Cart, Error, Permission, User } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { encryptQrCode } from '../../../src/utils/helpers';
import { forcePay } from '../../../src/operations/carts';

describe('POST /admin/scan/:qrcode', () => {
  let user: User;
  let admin: User;
  let adminToken: string;
  let cart: Cart;

  const validBody: { qrcode?: string } = {};

  before(async () => {
    user = await createFakeUser();
    admin = await createFakeUser({ permission: Permission.entry });
    adminToken = generateToken(admin);

    cart = await forcePay(user);

    validBody.qrcode = encryptQrCode(user.id).toString('base64');
  });

  after(async () => {
    // Delete the user created
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.log.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post('/admin/scan').send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user has no permissions', () => {
    const userToken = generateToken(user);
    return request(app)
      .post('/admin/scan')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the encryption is missing', () =>
    request(app)
      .post('/admin/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400, { error: Error.InvalidBody }));

  it('should error as the encryption is invalid', () =>
    request(app)
      .post('/admin/scan')
      .send({ qrcode: 'bonjour' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400, { error: Error.InvalidBody }));

  it('should error as the user has not paid', async () => {
    // Change the cart to refunded
    await database.cart.update({
      where: { id: cart.id },
      data: { transactionState: TransactionState.refunded },
    });

    await request(app)
      .post('/admin/scan')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.NotPaid });

    // Change back to paid
    await database.cart.update({
      where: { id: cart.id },
      data: { transactionState: TransactionState.paid },
    });
  });

  it('should error as the user was not found', async () => {
    const notFoundEncrypted = encryptQrCode('A12B3C').toString('base64');

    await request(app)
      .post('/admin/scan')
      .send({ qrcode: notFoundEncrypted })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userOperations, 'scanUser').throws('Unexpected error');

    // Request to login
    await request(app)
      .post('/admin/scan')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should scan the ticket', () =>
    request(app).post('/admin/scan').send(validBody).set('Authorization', `Bearer ${adminToken}`).expect(204));

  it('should error as the ticket is already scanned', () =>
    request(app)
      .post('/admin/scan')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.UserAlreadyScanned }));
});
