import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';

describe('PUT /users/current', () => {
  let user: User;
  let token: string;

  const validBody = {
    username: 'toto',
    password: 'lachaux59',
    newPassword: 'floLeParigo',
  };

  before(async () => {
    user = await createFakeUser({ password: validBody.password });
    token = generateToken(user);
  });

  after(async () => {
    // Delete the user created
    await database.log.deleteMany();
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('shoud fail because the body is empty', async () => {
    await request(app)
      .put(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidBody });
  });

  it('shoud fail because the password is missing', async () => {
    await request(app)
      .put(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'bonjour', newPassowrd: 'Bonjour123456' })
      .expect(400, { error: Error.InvalidBody });
  });

  it('should fail because the user is not authenticated', async () => {
    await request(app).put(`/users/current`).send(validBody).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail as the password is invalid', async () => {
    await request(app)
      .put(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody, password: 'wrongPassword' })
      .expect(401, { error: Error.InvalidCredentials });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(userOperations, 'updateUser').throws('Unexpected error');

    await request(app)
      .put(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should update the user', async () => {
    const { body } = await request(app)
      .put(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody)
      .expect(200);

    expect(body.username).to.be.equal(validBody.username);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;

    const logs = await database.log.findMany();
    expect(logs).to.have.lengthOf(1);

    const [log] = logs;

    // Check if the log is correct and doesn't include the password fields
    expect(log).to.deep.equal({
      path: `/users/current`,
      body: { username: body.username },
      method: 'PUT',
      userId: body.id,
      id: log.id,
      createdAt: log.createdAt,
    });
  });
});
