import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import * as settingsOperations from '../../src/operations/settings';
import { Error } from '../../src/types';
import env from '../../src/utils/env';
import { sandbox } from '../setup';

describe('GET /', () => {
  it('should return succesfully (without prefix)', async () => {
    const { body } = await request(app).get('/').expect(200);

    expect(body.http).to.be.true;
    expect(body.documentation).to.match(/https?:\/\/[\w.]+\/docs/);
  });

  it('should return succesfully (with prefix)', async () => {
    // Change the prefix temporarely to test if the url is correctly formed
    const oldPrefix = env.api.prefix;
    env.api.prefix = '/api';
    const { body } = await request(app).get('/').expect(200);
    env.api.prefix = oldPrefix;

    expect(body.http).to.be.true;
    expect(body.documentation).to.match(/https?:\/\/[\w.]+\/api\/docs/);
  });

  it('should return an internal server error', async () => {
    sandbox.stub(settingsOperations, 'fetchSettings').throws('Unexpected error');

    await request(app).get('/').expect(500, { error: Error.InternalServerError });
  });
});
