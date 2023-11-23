import { expect } from 'chai';
import request from 'supertest';
import { UserType } from '@prisma/client';
import app from '../../src/app';
import database from '../../src/services/database';
import * as userOperations from '../../src/operations/user';
import { Error, User } from '../../src/types';
import { setLoginAllowed } from '../../src/operations/settings';
import { sandbox } from '../setup';
import { createFakeUser } from '../utils';

describe('POST /auth/reset-password/:uuid', () => {
  let user: User;

  before(async () => {
    // Creates a fake user
    user = await createFakeUser({ type: UserType.player });

    // Generate a reset token as if we asked to reset the password
    const updatedUser = await userOperations.generateResetToken(user.id);

    user.resetToken = updatedUser.resetToken;
  });

  after(async () => {
    // Delete the user created
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  it('should return a bad request if the login is disabled', async () => {
    await setLoginAllowed(false);
    await request(app)
      .post(`/auth/reset-password/${user.resetToken}`)
      .send({ password: 'bonjour' })
      .expect(403, { error: Error.LoginNotAllowed });
    await setLoginAllowed(true);
  });

  it('should return a bad request due to an incorrect token', async () => {
    await request(app)
      .post('/auth/reset-password/incorrectToken')
      .send({ password: 'new password' })
      .expect(400, { error: Error.InvalidParameters });
  });

  it('should not accept unknown token', async () => {
    await request(app)
      .post('/auth/reset-password/A1B2C3')
      .send({ password: 'new password' })
      .expect(400, { error: Error.InvalidParameters });
  });

  it('should not accept incorrect body', async () => {
    await request(app)
      .post(`/auth/reset-password/${user.resetToken}`)
      .send({ fake: 'fake' })
      .expect(400, { error: Error.InvalidPassword });
  });

  it('should return an internal server error', async () => {
    sandbox.stub(userOperations, 'fetchUser').throws('Unexpected error');

    await request(app)
      .post(`/auth/reset-password/${user.resetToken}`)
      .send({ password: 'validPassword' })
      .expect(500, { error: Error.InternalServerError });
  });

  it('should reset the password', async () => {
    const response = await request(app)
      .post(`/auth/reset-password/${user.resetToken}`)
      .send({ password: 'validPassword' })
      .expect(200);

    expect(response.body.token).to.be.a('string');
    expect(response.body.user).to.be.an('object');

    const updatedUser = await userOperations.fetchUser(user.id);

    expect(updatedUser.resetToken).to.be.null;
  });

  it('should login with the new password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        login: user.email,
        password: 'validPassword',
      })
      .expect(200);

    expect(response.body.token).to.be.a('string');
    expect(response.body.user).to.be.an('object');
  });
});
