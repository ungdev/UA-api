import request from 'supertest';
import app from '../../src/app';
import database from '../../src/services/database';
import * as userOperations from '../../src/operations/user';
import { Error, User, UserType } from "../../src/types";
import { setLoginAllowed } from '../../src/operations/settings';
import { sandbox } from '../setup';
import { createFakeUser } from '../utils';

describe('POST /auth/validate/{token}', () => {
  const password = 'yolo59';
  let user: User;

  before(async () => {
    // Creates a fake user not confirmed
    user = await createFakeUser({ password, confirmed: false, type: UserType.player });
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should get an error as the login is not allowed', async () => {
    await setLoginAllowed(false);
    await request(app).post('/auth/validate/wrongtoken').expect(403, { error: Error.LoginNotAllowed });
    await setLoginAllowed(true);
  });

  it('should not accept wrong token', async () => {
    await request(app).post('/auth/validate/wrongtoken').expect(400, { error: Error.InvalidParameters });
  });

  it('should not accept unknown token', async () => {
    await request(app).post('/auth/validate/A1B2C3').expect(400, { error: Error.InvalidParameters });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userOperations, 'removeUserRegisterToken').throws('Unexpected error');

    // Request to validate the user
    await request(app).post(`/auth/validate/${user.registerToken}`).expect(500, { error: Error.InternalServerError });
  });

  it('should not log in as the account is not validated', async () => {
    await request(app)
      .post('/auth/login')
      .send({
        login: user.email,
        password: user.password,
      })
      .expect(403, { error: Error.EmailNotConfirmed });
  });

  it('should validate the user', async () => {
    await request(app).post(`/auth/validate/${user.registerToken}`).expect(200);
  });
});
