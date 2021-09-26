import { expect } from 'chai';
import request from 'supertest';
import prisma, { UserType } from '@prisma/client';
import app from '../../src/app';
import * as userUtils from '../../src/utils/users';
import { Error } from '../../src/types';
import { setLoginAllowed } from '../../src/operations/settings';
import database from '../../src/services/database';
import { sandbox } from '../setup';
import { createFakeUser } from '../utils';

describe('POST /auth/login', () => {
  const password = 'bonjour123456';
  let user: prisma.User;

  before(async () => {
    user = await createFakeUser({ password });
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should get an error as the login is not allowed', async () => {
    await setLoginAllowed(false);
    await request(app)
      .post('/auth/login')
      .send({
        login: user.email,
        password,
      })
      .expect(403, { error: Error.LoginNotAllowed });

    // Allow login for next tests
    await setLoginAllowed(true);
  });

  it('should return an error as incorrect body', async () => {
    await request(app)
      .post('/auth/login')
      .send({
        login: user.email,
      })
      .expect(400, { error: Error.InvalidBody });
  });

  it('should return an error as incorrect credentials (wrong password)', async () => {
    await request(app)
      .post('/auth/login')
      .send({
        login: user.email,
        password: 'wrongpassword',
      })
      .expect(401, { error: Error.InvalidCredentials });
  });

  it('should return an error as incorrect credentials (wrong email)', async () => {
    await request(app)
      .post('/auth/login')
      .send({
        login: 'wrong@email.fr',
        password: user.password,
      })
      .expect(401, { error: Error.InvalidCredentials });
  });

  it('should return an error as incorrect credentials (neither username nor email)', async () => {
    await request(app)
      .post('/auth/login')
      .send({
        login: 'email.fr',
        password: user.password,
      })
      .expect(401, { error: Error.InvalidCredentials });
  });

  // This case should never happen
  it('should error because the user is an attendant', async () => {
    const visitorEmail = 'bonjour@lol.fr';
    const visitorPassword = 'randomPass';
    await createFakeUser({ type: UserType.attendant, email: visitorEmail, password: visitorPassword });

    await request(app)
      .post('/auth/login')
      .send({
        login: visitorEmail,
        password: visitorPassword,
      })
      .expect(403, { error: Error.LoginAsAttendant });
  });

  let authorizationToken = '';

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userUtils, 'generateToken').throws('Unexpected error');

    // Request to login
    await request(app)
      .post('/auth/login')
      .send({
        login: user.email,
        password,
      })
      .expect(500, { error: Error.InternalServerError });
  });

  it('should validate the login', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        login: user.email,
        password,
      })
      .expect(200);

    expect(response.body.user).to.be.an('object');
    expect(response.body.token).to.be.a('string');

    authorizationToken = response.body.token;
  });

  it('should validate the login even with a username', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        login: user.username,
        password,
      })
      .expect(200);

    expect(response.body.user).to.be.an('object');
    expect(response.body.token).to.be.a('string');

    authorizationToken = response.body.token;
  });

  it('should return a bad request because we are already authenticated', async () => {
    await request(app)
      .post('/auth/login')
      .set('Authorization', `Bearer ${authorizationToken}`)
      .send({
        login: user.email,
        password,
      })
      .expect(403, { error: Error.AlreadyAuthenticated });
  });
});
