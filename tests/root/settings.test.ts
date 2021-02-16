import request from 'supertest';
import app from '../../src/app';
import * as settingsOperations from '../../src/operations/settings';
import { Error } from '../../src/types';
import { sandbox } from '../setup';

describe('GET /settings', () => {
  it('should return 200 with an object', async () => {
    await settingsOperations.setLoginAllowed(false);
    await settingsOperations.setShopAllowed(false);

    await request(app).get('/settings').expect(200, { shop: false, login: false });
  });

  it('should return the updated value', async () => {
    await settingsOperations.setLoginAllowed(true);
    await settingsOperations.setShopAllowed(true);
    await request(app).get('/settings').expect(200, { shop: true, login: true });
  });

  it('should return an internal server error', async () => {
    sandbox.stub(settingsOperations, 'fetchSettings').throws('Unexpected error');

    await request(app).get('/settings').expect(500, { error: Error.InternalServerError });
  });
});
