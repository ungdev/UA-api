import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Cart, Error, Permission, User, UserType, TransactionState } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { encrypt } from '../../../src/utils/helpers';
import { forcePay } from '../../../src/operations/carts';

describe('POST /admin/scan/:qrcode', () => {
  let user: User;
  let admin: User;
  let adminToken: string;
  let cart: Cart;

  const validBody: { qrcode?: string } = {};

  before(async () => {
    const team = await createFakeTeam({
      members: 1,
    });
    [user] = team.players;
    admin = await createFakeUser({ permissions: [Permission.entry], type: UserType.player });
    adminToken = generateToken(admin);

    cart = await forcePay(user);

    validBody.qrcode = encrypt(user.id).toString('base64');
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
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
      .expect(400, { error: Error.NoQRCode }));

  it('should error as the encryption is invalid', () =>
    request(app)
      .post('/admin/scan')
      .send({ qrcode: 'bonjour' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400, { error: Error.InvalidQRCode }));

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
    const notFoundEncrypted = encrypt('A12B3C').toString('base64');

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

  it('should scan the ticket and return the updated user', async () => {
    const userData = await request(app)
      .post('/admin/scan')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(userData.body.customMessage).to.be.equal(user.customMessage);
    return expect(userData.body.scannedAt).not.to.be.equal(null);
  });

  it('should scan the ticket and return the updated spectator (with no team)', async () => {
    const spectator = await createFakeUser({
      type: UserType.spectator,
    });
    await forcePay(spectator);
    const body = {
      qrcode: encrypt(spectator.id).toString('base64'),
    };

    const userData = await request(app)
      .post('/admin/scan')
      .send(body)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(userData.body.customMessage).to.be.equal(spectator.customMessage);
    return expect(userData.body.scannedAt).not.to.be.equal(null);
  });

  it('should scan a user with his id only', async () => {
    const scannableUser = await createFakeUser({ type: UserType.player });
    await forcePay(scannableUser);
    const body = {
      userId: scannableUser.id,
    };

    const userData = await request(app)
      .post('/admin/scan')
      .send(body)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(userData.body.customMessage).to.be.equal(scannableUser.customMessage);
    return expect(userData.body.scannedAt).not.to.be.equal(null);
  });

  it('should error as the ticket is already scanned', () =>
    request(app)
      .post('/admin/scan')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.UserAlreadyScanned }));
});
