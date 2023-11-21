import { expect } from 'chai';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as userOperations from '../../../src/operations/user';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { generateToken } from '../../../src/utils/users';
import { createFakeUser } from '../../utils';

describe('POST /admin/users', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  const validBody = {
    username: 'Nettie_Lehner', // faker.internet.userName() does not work as it can return a username with a dot
    lastname: faker.person.lastName(),
    firstname: faker.person.firstName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    permissions: ['admin'],
    customMessage: faker.lorem.sentence(),
  };

  after(async () => {
    await database.user.deleteMany();
  });

  before(async () => {
    admin = await createFakeUser({ permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({ type: UserType.player });
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/users`).send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .post(`/admin/users`)
      .send(validBody)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(userOperations, 'createUser').throws('Unexpected error');
    await request(app)
      .post('/admin/users')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should add a new user', async () => {
    const response = await request(app)
      .post('/admin/users')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.username).to.equal(validBody.username);
    expect(response.body.lastname).to.equal(validBody.lastname);
    expect(response.body.firstname).to.equal(validBody.firstname);
    expect(response.body.email).to.equal(validBody.email);
    expect(response.body.permissions).to.deep.equal(validBody.permissions.join(','));
    expect(response.body.customMessage).to.equal(validBody.customMessage);
  });
});
