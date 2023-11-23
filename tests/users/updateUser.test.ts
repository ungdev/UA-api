import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';

const wait = (ms: number) =>
  new Promise<void>((result) => {
    setTimeout(result, ms);
  });

describe('PATCH /users/current', () => {
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
    await database.cart.deleteMany();
    await database.orga.deleteMany();
await database.user.deleteMany();
  });

  it('shoud fail because the body is empty', async () => {
    await request(app)
      .patch(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidPassword });
  });

  it('shoud fail because the password is missing', async () => {
    await request(app)
      .patch(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'bonjour', newPassowrd: 'Bonjour123456' })
      .expect(400, { error: Error.InvalidPassword });
  });

  it('should fail because the user is not authenticated', async () => {
    await request(app).patch(`/users/current`).send(validBody).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail as the password is invalid', async () => {
    await request(app)
      .patch(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody, password: 'wrongPassword' })
      .expect(401, { error: Error.InvalidCredentials });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(userOperations, 'updateUser').throws('Unexpected error');

    await request(app)
      .patch(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should update the user (username only)', async () => {
    const username = 'tartempiondu10';
    const { body } = await request(app)
      .patch(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        username,
        password: validBody.password,
      })
      .expect(200);

    expect(body.username).to.be.equal(username);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;

    // Logs may take some time to written out
    // as they are supposed to be written after the success of the request
    await wait(100);
    const logs = await database.log.findMany();
    expect(logs).to.have.lengthOf(1);

    const [log] = logs;

    // Check if the log is correct and doesn't include the password values
    expect(log).to.deep.equal({
      path: `/users/current`,
      body: { username, password: '***' },
      method: 'PATCH',
      userId: body.id,
      id: log.id,
      createdAt: log.createdAt,
    });

    return database.log.deleteMany();
  });

  it('should fail as username is already in use', async () => {
    const username = 'tartempiondu10';
    const password = 'whatARandomPassword';

    const otherUser = await createFakeUser({ password });
    const userToken = generateToken(otherUser);

    return request(app)
      .patch(`/users/current`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        username,
        password,
      })
      .expect(409, { error: Error.UsernameAlreadyExists });
  });

  it('should update the user', async () => {
    const { body } = await request(app)
      .patch(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody)
      .expect(200);

    expect(body.username).to.be.equal(validBody.username);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;

    // Logs may take some time to be written out
    // as they are supposed to be written after the success of the request
    await wait(100);
    const logs = await database.log.findMany();
    expect(logs).to.have.lengthOf(1);

    const [log] = logs;

    // Check if the log is correct and doesn't include the password values
    expect(log).to.deep.equal({
      path: `/users/current`,
      body: {
        username: body.username,
        password: '***',
        newPassword: '***',
      },
      method: 'PATCH',
      userId: body.id,
      id: log.id,
      createdAt: log.createdAt,
    });
  });
});
