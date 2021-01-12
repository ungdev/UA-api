import sinon from 'sinon';
import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app';
import database from '../src/services/database';
import * as user from '../src/operations/user';
import * as userUtils from '../src/utils/user';
import { Error } from '../src/types';
import { setLoginAllowed } from '../src/operations/settings';

describe('Auth API', () => {
  const sandbox = sinon.createSandbox();

  // Before each, allow login
  beforeEach(() => setLoginAllowed(true));

  // After each, reset the stub sandbox
  afterEach(() => {
    sandbox.restore();
  });

  // After, delete all users and disable login
  after(async () => {
    await setLoginAllowed(false);

    // Delete all the users created
    await database.user.deleteMany();
  });

  const validBody = {
    username: 'toto',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@test.com',
    password: 'jesuisthomas',
    type: 'player',
  };

  describe('POST /auth/register', () => {
    it('should get an error as the login is not allowed', async () => {
      await setLoginAllowed(false);
      await request(app).post('/auth/register').send(validBody).expect(400, { error: Error.LoginNotAllowed });
    });

    it('should be able to register as orga', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          ...validBody,
          type: 'orga',
        })
        .expect(400, { error: Error.BadRequest });
    });

    it('should throw an internal server error', async () => {
      sandbox.stub(user, 'createUser').throws('Unexpected error');

      await request(app).post('/auth/register').send(validBody).expect(500, { error: Error.Unknown });
    });

    it('should create a user', async () => {
      await request(app).post('/auth/register').send(validBody).expect(201);
      const newUser = await database.user.findUnique({
        where: {
          email: validBody.email,
        },
      });
      newUser.firstname.should.be.equal('John');
      newUser.id.should.have.lengthOf(6);
    });

    it('should not create a duplicate user', async () => {
      await request(app).post('/auth/register').send(validBody).expect(400);
    });

    it('should not create a user with incomplete body', async () => {
      await request(app)
        .post('/auth/register')
        .send({ firstname: validBody.firstname, email: validBody.email })
        .expect(400);
    });

    it('should not accept wrong email', async () => {
      await request(app)
        .post('/auth/register')
        .send({ ...validBody, email: 'wrong email' })
        .expect(400);
    });

    it('should not accept wrong type', async () => {
      await request(app)
        .post('/auth/register')
        .send({ ...validBody, type: 'wrong type' })
        .expect(400);
    });
  });

  // Tries to login before being validated
  describe('POST /auth/login (before validation)', () => {
    it('should return an error as not beging validated', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: validBody.email,
          password: validBody.password,
        })
        .expect(400, { error: Error.EmailNotConfirmed });
    });
  });

  describe('POST /auth/validate/{token}', () => {
    it('should not accept wrong token', async () => {
      await request(app).post('/auth/validate/wrongtoken').expect(400, { error: Error.BadRequest });
    });

    it('should not accept unknown token', async () => {
      await request(app).post('/auth/validate/A1B2C3').expect(400, { error: Error.BadRequest });
    });

    it('should get an error as the login is not allowed', async () => {
      await setLoginAllowed(false);
      await request(app).post('/auth/validate/wrongtoken').expect(400, { error: Error.LoginNotAllowed });
    });

    it('should throw an internal server error', async () => {
      // Fake the main function to throw
      sandbox.stub(user, 'removeUserRegisterToken').throws('Unexpected error');

      // Fetch the valid user token
      const newUser = await database.user.findUnique({
        where: {
          email: validBody.email,
        },
      });

      // Request to validate the user
      await request(app).post(`/auth/validate/${newUser.registerToken}`).expect(500, { error: Error.Unknown });
    });

    it('should validate the user', async () => {
      const newUser = await database.user.findUnique({
        where: {
          email: validBody.email,
        },
      });

      await request(app).post(`/auth/validate/${newUser.registerToken}`).expect(200);
    });
  });

  describe('POST /auth/login', () => {
    it('should get an error as the login is not allowed', async () => {
      await setLoginAllowed(false);
      await request(app)
        .post('/auth/login')
        .send({
          email: validBody.email,
          password: validBody.password,
        })
        .expect(400, { error: Error.LoginNotAllowed });
      await setLoginAllowed(true);
    });

    it('should return an error as incorrect body', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: validBody.email,
        })
        .expect(400, { error: Error.BadRequest });
    });

    it('should return an error as incorrect credentials', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: validBody.email,
          password: 'wrongpassword',
        })
        .expect(400, { error: Error.InvalidCredentials });
    });

    it('should return an error as incorrect credentials', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@email.fr',
          password: validBody.password,
        })
        .expect(400, { error: Error.InvalidCredentials });
    });

    let authorizationToken = '';

    it('should throw an internal server error', async () => {
      // Fake the main function to throw
      sandbox.stub(userUtils, 'generateToken').throws('Unexpected error');

      // Request to login
      await request(app)
        .post('/auth/login')
        .send({
          email: validBody.email,
          password: validBody.password,
        })
        .expect(500, { error: Error.Unknown });
    });

    it('should validate the login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: validBody.email,
          password: validBody.password,
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
          email: validBody.email,
          password: validBody.password,
        })
        .expect(400, { error: Error.AlreadyAuthenticated });
    });
  });
});
