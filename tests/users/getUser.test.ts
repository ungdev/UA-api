import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as responses from '../../src/utils/responses';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/user';

describe('GET /users/current', () => {
  let user: User;
  let token: string;

  before(async () => {
    user = await createFakeUser({ username: 'alban' });
    token = generateToken(user);
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should fail as the user is not authenticated', async () => {
    await request(app).get('/users/current').expect(401, { error: Error.Unauthenticated });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(responses, 'success').throws('Unexpected error');

    await request(app)
      .get(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return the user', async () => {
    const { body } = await request(app).get(`/users/current`).set('Authorization', `Bearer ${token}`).expect(200);

    expect(body.username).to.be.equal('alban');
    expect(body.hasPaid).to.be.false;
    expect(body.createdAt).to.be.undefined;
  });
});
