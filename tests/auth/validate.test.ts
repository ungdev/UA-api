import faker from 'faker';
import prisma from '@prisma/client';
import request from 'supertest';
import app from '../../src/app';
import database from '../../src/services/database';
import * as userOperations from '../../src/operations/user';
import { Error } from '../../src/types';
import { setLoginAllowed } from '../../src/operations/settings';
import { sandbox } from '../setup';

describe('POST /auth/validate/{token}', () => {
  const password = 'yolo59';
  let user: prisma.User;

  before(async () => {
    // Creates a fake user
    user = await userOperations.createUser(
      faker.internet.userName(),
      faker.name.firstName(),
      faker.name.lastName(),
      faker.internet.email(),
      password,
    );
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should get an error as the login is not allowed', async () => {
    await setLoginAllowed(false);
    await request(app).post('/auth/validate/wrongtoken').expect(400, { error: Error.LoginNotAllowed });
    await setLoginAllowed(true);
  });

  it('should not accept wrong token', async () => {
    await request(app).post('/auth/validate/wrongtoken').expect(400, { error: Error.BadRequest });
  });

  it('should not accept unknown token', async () => {
    await request(app).post('/auth/validate/A1B2C3').expect(400, { error: Error.BadRequest });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userOperations, 'removeUserRegisterToken').throws('Unexpected error');

    // Request to validate the user
    await request(app).post(`/auth/validate/${user.registerToken}`).expect(500, { error: Error.Unknown });
  });

  it('should not log in as the account is not validated', async () => {
    await request(app)
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      })
      .expect(400, { error: Error.EmailNotConfirmed });
  });

  it('should validate the user', async () => {
    await request(app).post(`/auth/validate/${user.registerToken}`).expect(200);
  });
});
