import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as responses from '../../src/utils/responses';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';

describe('GET /users/search', () => {
  let user: User;
  let token: string;
  before(async () => {
    user = await createFakeUser({
      username: 'rinkichi',
      email: 'ragequit@ez.com',
    });
    token = generateToken(user);
  });

  after(async () => {
    await database.user.deleteMany();
  });

  it('should fail as the user is not authenticated', async () => {
    await request(app).get('/users/search?query=rinkichi').expect(401, { error: Error.Unauthenticated });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(responses, 'success').throws('Unexpected error');
    await request(app)
      .get('/users/search?query=rinkichi')
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should not accept empty query parameters', async () => {
    await request(app)
      .get('/users/search?query=')
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should not accept bad query parameters', async () => {
    await request(app)
      .get('/users/search?find=')
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should return not accept unknown user', async () => {
    await request(app)
      .get('/users/search?query=mdr')
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should return the user with his username', async () => {
    const { body } = await request(app)
      .get('/users/search?query=rinkichi')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body.username).to.be.equal('rinkichi');
    expect(body.hasPaid).to.be.false;
    expect(body.createdAt).to.be.undefined;
  });

  it('should return the user with his email', async () => {
    const { body } = await request(app)
      .get('/users/search?query=ragequit@ez.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(body.username).to.be.equal('rinkichi');
    expect(body.hasPaid).to.be.false;
    expect(body.createdAt).to.be.undefined;
  });
});
