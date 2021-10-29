import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import * as userUtils from '../../../src/utils/users';
import { sandbox } from '../../setup';

describe('POST /admin/auth/login', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    user = await createFakeUser();
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = userUtils.generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/auth/login/${user.id}`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = userUtils.generateToken(user);
    return request(app)
      .post(`/admin/auth/login/${user.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error because the user is an attendant', async () => {
    const visitor = await createFakeUser({ type: UserType.attendant });

    await request(app)
      .post(`/admin/auth/login/${visitor.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.LoginAsAttendant });
  });

  it('should error because the user is not confirmed', async () => {
    const notConfirmedUser = await createFakeUser({ confirmed: false });

    await request(app)
      .post(`/admin/auth/login/${notConfirmedUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.EmailNotConfirmed });
  });

  it('should error because the user is not found', async () => {
    await request(app)
      .post(`/admin/auth/login/A1B2C3`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userUtils, 'generateToken').throws('Unexpected error');

    // Request to login
    await request(app)
      .post(`/admin/auth/login/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should validate the login', async () => {
    const { body } = await request(app)
      .post(`/admin/auth/login/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.user).to.be.an('object');
    expect(body.token).to.be.a('string');
  });
});
