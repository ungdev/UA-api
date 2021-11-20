import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User } from '../../../src/types';
import * as cartOperations from '../../../src/operations/carts';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';

describe('POST /admin/users/:userId/force-pay', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    user = await createFakeUser();
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/users/${user.id}/force-pay`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not found', () =>
    request(app)
      .post('/admin/users/A12B3C/force-pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound }));

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(cartOperations, 'forcePay').throws('Unexpected error');

    // Request to login
    await request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should force pay the user', async () => {
    const { body } = await request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.hasPaid).to.be.true;
  });

  it('should fail as the user has already been force payed', () =>
    request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.AlreadyPaid }));

  it('should force pay the user and scan his ticket at the same time', async () => {
    const otherUser = await createFakeUser();
    const { body } = await request(app)
      .post(`/admin/users/${otherUser.id}/force-pay`)
      .send({
        consume: true,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.hasPaid).to.be.true;
    expect(body.scannedAt).not.to.be.null;
  });
});
