import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as responses from '../../src/utils/responses';
import database from '../../src/services/database';
import { Error } from '../../src/types';
import { createFakeUser } from '../utils';

describe('GET /users/search', () => {
  before(async () => {
    await createFakeUser({
      username: 'rinkichi',
      email: 'ragequit@ez.com',
    });
  });

  after(async () => {
    await database.user.deleteMany();
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(responses, 'success').throws('Unexpected error');

    await request(app).get('/users/search?query=rinkichi').expect(500, { error: Error.InternalServerError });
  });

  it('should not accept empty query parameters', async () => {
    await request(app).get('/users/search?query=').expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should not accept bad query parameters', async () => {
    await request(app).get('/users/search?find=').expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should return not accept unknown user', async () => {
    await request(app).get('/users/search?query=mdr').expect(404, { error: Error.UserNotFound });
  });

  it('should return the user with his username', async () => {
    const { body } = await request(app).get('/users/search?query=rinkichi').expect(200);

    expect(body.username).to.be.equal('rinkichi');
    expect(body.hasPaid).to.be.false;
    expect(body.createdAt).to.be.undefined;
  });

  it('should return the user with his email', async () => {
    const { body } = await request(app).get('/users/search?query=ragequit@ez.com').expect(200);
    expect(body.username).to.be.equal('rinkichi');
    expect(body.hasPaid).to.be.false;
    expect(body.createdAt).to.be.undefined;
  });
});
