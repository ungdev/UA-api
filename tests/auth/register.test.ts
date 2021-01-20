import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import database from '../../src/services/database';
import * as userOperations from '../../src/operations/user';
import { Error } from '../../src/types';
import { setLoginAllowed } from '../../src/operations/settings';
import { sandbox } from '../setup';

describe('POST /auth/register', () => {
  // After, delete all users and disable login
  after(async () => {
    // Delete all the users created
    await database.user.deleteMany();
  });

  const userData = {
    username: 'toto',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@test.com',
    password: 'jesuisthomas',
    type: 'player',
  };

  it('should get an error as the login is not allowed', async () => {
    await setLoginAllowed(false);

    await request(app).post('/auth/register').send(userData).expect(403, { error: Error.LoginNotAllowed });

    await setLoginAllowed(true);
  });

  it('should be able to register as orga', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        ...userData,
        type: 'orga',
      })
      .expect(400, { error: Error.InvalidBody });
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(userOperations, 'createUser').throws('Unexpected error');

    await request(app).post('/auth/register').send(userData).expect(500, { error: Error.InternalServerError });
  });

  it('should create a user', async () => {
    await request(app).post('/auth/register').send(userData).expect(201);
    const newUser = await userOperations.fetchUser(userData.email, 'email');
    newUser.firstname.should.be.equal('John');
    newUser.id.should.have.lengthOf(6);
    expect(newUser.registerToken).to.have.lengthOf(6);
  });

  it('should not create a duplicate user', async () => {
    await request(app).post('/auth/register').send(userData).expect(409, { error: Error.EmailAlreadyExists });
  });

  it('should not create a user with incomplete body', async () => {
    await request(app)
      .post('/auth/register')
      .send({ firstname: userData.firstname, email: userData.email })
      .expect(400, { error: Error.InvalidBody });
  });

  it('should not accept wrong email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ ...userData, email: 'wrong email' })
      .expect(400, { error: Error.InvalidBody });
  });

  it('should not accept wrong type', async () => {
    await request(app)
      .post('/auth/register')
      .send({ ...userData, type: 'wrong type' })
      .expect(400, { error: Error.InvalidBody });
  });
});
