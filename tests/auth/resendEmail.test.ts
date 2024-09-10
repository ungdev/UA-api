import request from 'supertest';
import app from '../../src/app';
import * as userOperations from '../../src/operations/user';
import * as mailOperations from '../../src/services/email';
import { Error, User, UserType } from '../../src/types';
import database from '../../src/services/database';
import { sandbox } from '../setup';
import { createFakeUser } from '../utils';

describe('POST /auth/resendEmail', () => {
  const password = 'bonjour123456';
  let user: User;
  let confirmedUser: User;

  before(async () => {
    // Creates fake user with email
    confirmedUser = await createFakeUser({ password, type: UserType.player });
    user = await createFakeUser({ password, confirmed: false, type: UserType.player });
  });

  beforeEach(() => {
    sandbox.stub(mailOperations, 'sendEmail');
  });

  after(async () => {
    // Delete the user created
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  it('should return a bad request because of incorrect body', async () => {
    await request(app)
      .post('/auth/resendEmail')
      .send({
        fake: 'fake',
      })
      .expect(400, { error: Error.InvalidUsername });
  });

  it('should return an error as incorrect credentials (wrong password)', async () => {
    await request(app)
      .post('/auth/resendEmail')
      .send({
        username: user.username,
        email: user.email,
        password: 'wrongpassword',
      })
      .expect(401, { error: Error.InvalidCredentials });
  });

  it('should return an internal server error', async () => {
    sandbox.stub(userOperations, 'fetchUser').throws('Unexpected error');

    await request(app)
      .post('/auth/resendEmail')
      .send({
        username: user.username,
        email: user.email,
        password,
      })
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return an invalid credentials error as the username or the email is wrong', async () => {
    await request(app)
      .post('/auth/resendEmail')
      .send({
        username: 'wrongusername',
        email: 'wrongemail@mail.com',
        password,
      })
      .expect(401, { error: Error.InvalidCredentials });
  });

  it('should return an email already confirmed error', async () => {
    await request(app)
      .post('/auth/resendEmail')
      .send({
        username: confirmedUser.username,
        email: confirmedUser.email,
        password,
      })
      .expect(403, { error: Error.EmailAlreadyConfirmed });
  });

  it('should return an error as the code has not been sent successfully', async () => {
    sandbox.stub(mailOperations, 'sendValidationCode').throws('Unexpected error');
    await request(app)
      .post('/auth/resendEmail')
      .send({
        username: user.username,
        email: user.email,
        password,
      })
      .expect(500);
  });

  it('should return a valid response', async () => {
    await request(app)
      .post('/auth/resendEmail')
      .send({
        username: user.username,
        email: user.email,
        password,
      })
      .expect(200);
  });
});
