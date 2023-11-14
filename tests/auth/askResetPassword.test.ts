import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import * as userOperations from '../../src/operations/user';
import { Error, User } from '../../src/types';
import { setLoginAllowed } from '../../src/operations/settings';
import database from '../../src/services/database';
import { sandbox } from '../setup';
import { createFakeUser } from '../utils';
import { UserType } from "@prisma/client";

describe('POST /auth/reset-password/ask', () => {
  let user: User;

  before(async () => {
    // Creates a fake user with email validated
    user = await createFakeUser({type: UserType.player});
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should return an error because the login is not allowed', async () => {
    await setLoginAllowed(false);
    await request(app)
      .post('/auth/reset-password/ask')
      .send({ email: user.email })
      .expect(403, { error: Error.LoginNotAllowed });
    await setLoginAllowed(true);
  });

  it('should return a bad request because of incorrect body', async () => {
    await request(app)
      .post('/auth/reset-password/ask')
      .send({
        fake: 'fake',
      })
      .expect(400, { error: Error.InvalidEmail });
  });

  it('should return valid answer even if incorrect email', async () => {
    await request(app)
      .post('/auth/reset-password/ask')
      .send({
        email: 'fake@email.fr',
      })
      .expect(204);
  });

  it('should return an internal server error', async () => {
    sandbox.stub(userOperations, 'fetchUser').throws('Unexpected error');

    await request(app)
      .post('/auth/reset-password/ask')
      .send({
        email: user.email,
      })
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return a valid response', async () => {
    await request(app)
      .post('/auth/reset-password/ask')
      .send({
        email: user.email,
      })
      .expect(204);

    const updatedUser = await userOperations.fetchUser(user.id);

    expect(updatedUser.resetToken).to.have.lengthOf(6);
  });
});
