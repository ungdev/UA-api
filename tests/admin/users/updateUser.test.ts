import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { forcePay } from '../../../src/operations/carts';

describe('PATCH /admin/users/:userId', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

  const validBody: {
    type: string;
    place: string;
    permissions: Permission[];
  } = {
    type: 'player',
    place: 'A23',
    permissions: [],
  };

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

  it('should work if body is incomplete', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .send({
        type: 'player',
        permissions: [],
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200));

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/users/${user.id}`).send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the body is invalid', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .send({ ...validBody, permissions: ['bonjour'] })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400, { error: Error.InvalidBody }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not found', () =>
    request(app)
      .patch('/admin/users/A12B3C')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(404, { error: Error.UserNotFound }));

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userOperations, 'updateAdminUser').throws('Unexpected error');

    // Request to login
    await request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should update the user', async () => {
    const { body } = await request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(200);

    const updatedUser = await userOperations.fetchUser(user.id);

    expect(body.type).to.be.equal(validBody.type);
    expect(body.place).to.be.equal(validBody.place);

    expect(body.type).to.be.equal(updatedUser.type);
    expect(body.place).to.be.equal(updatedUser.place);
  });

  it('should fail as the user has already paid and wants to change its type', async () => {
    await forcePay(user);
    await request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validBody, type: 'coach' })
      .expect(403, { error: Error.CannotChangeType });
  });
});
