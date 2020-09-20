import chai from 'chai';
import request from 'supertest';
import app from '../src/app';
import database from '../src/utils/database';
import { Error } from '../src/types';

chai.should();

describe.skip('Auth API', () => {
  const validBody = {
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@test.com',
    password: 'jesuisthomas',
    type: 'player',
  };
  describe('POST /auth/register', () => {
    it('should create a user', async () => {
      await request(app).post('/auth/register').send(validBody).expect(201);
      const newUser = await database.user.findOne({
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
    it('should not create a user with imcomplete body', async () => {
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
  describe('POST /auth/validate/{token}', () => {
    it('should not accept wrong token', async () => {
      await request(app).post('/auth/validate/wrongtoken').expect(404, { error: Error.WrongRegisterToken });
    });
    it('should validate the user', async () => {
      const newUser = await database.user.findOne({
        where: {
          email: validBody.email,
        },
      });
      const response = await request(app).post(`/auth/validate/${newUser.registerToken}`).expect(200);
      newUser.should.include(response.body.user);
    });
  });
});
