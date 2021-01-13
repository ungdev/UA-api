import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import * as userOperations from '../../src/operations/user';
import { Error, User } from '../../src/types';
import { setLoginAllowed } from '../../src/operations/settings';
import database from '../../src/services/database';
import { sandbox } from '../setup';
import { createFakeConfirmedUser } from '../utils';

describe('POST /auth/reset-password', () => {
  let user: User;

  before(async () => {
    // Creates a fake user with email validated
    user = await createFakeConfirmedUser();
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should return an error because the login is not allowed', async () => {
    await setLoginAllowed(false);
    await request(app)
      .post('/auth/reset-password')
      .send({ email: user.email })
      .expect(400, { error: Error.LoginNotAllowed });
    await setLoginAllowed(true);
  });

  it('should return a bad request because of incorrect body', async () => {
    await request(app)
      .post('/auth/reset-password')
      .send({
        fake: 'fake',
      })
      .expect(400, { error: Error.BadRequest });
  });

  it('should return a not found because of incorrect email', async () => {
    await request(app)
      .post('/auth/reset-password')
      .send({
        email: 'fake@email.fr',
      })
      .expect(404, { error: Error.UserNotFound });
  });

  it('should return an internal server error', async () => {
    sandbox.stub(userOperations, 'fetchUser').throws('Unexpected error');

    await request(app)
      .post('/auth/reset-password')
      .send({
        email: user.email,
      })
      .expect(500, { error: Error.Unknown });
  });

  it('should return a valid response', async () => {
    await request(app)
      .post('/auth/reset-password')
      .send({
        email: user.email,
      })
      .expect(204);

    const updatedUser = await userOperations.fetchUser(user.id);

    expect(updatedUser.resetToken).to.have.lengthOf(6);
  });
});