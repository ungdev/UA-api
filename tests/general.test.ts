import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app';
import * as settingsOperations from '../src/operations/settings';
import { Error } from '../src/types';
import { sandbox } from './setup';
import * as slackService from '../src/services/slack';

describe('General API', () => {
  describe('GET /', () => {
    it('should return succesfully', async () => {
      const { body } = await request(app).get('/').expect(200);

      expect(body.http).to.be.true;
      expect(body.documentation).to.match(/https?:\/\/[\w.]+\/docs/);
    });

    it('should return an internal server error', async () => {
      sandbox.stub(settingsOperations, 'fetchSettings').throws('Unexpected error');

      await request(app).get('/').expect(500, { error: Error.InternalServerError });
    });
  });

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

  describe('POST /contact', () => {
    it('should send an internal server error', async () => {
      sandbox.stub(slackService, 'sendSlackContact').throws('Unexpected error');
      const body = {
        name: 'John Doe',
        email: 'john.doe@test.com',
        subject: 'Test',
        message: 'Test test',
      };
      await request(app).post('/contact').send(body).expect(500, { error: Error.InternalServerError });
    });

    it('should send the message with a 204', async () => {
      sandbox.stub(slackService, 'sendSlackContact');

      const body = {
        name: 'John Doe',
        email: 'john.doe@test.com',
        subject: 'Test',
        message: 'Test test',
      };
      await request(app).post('/contact').send(body).expect(204);
    });

    it('should not accept wrong email', async () => {
      const body = {
        name: 'John Doe',
        email: 'wrong email',
        subject: 'Test',
        message: 'Test test',
      };
      await request(app).post('/contact').send(body).expect(400, { error: Error.InvalidBody });
    });

    it('should not accept missing parameters in body', async () => {
      const body = {
        subject: 'Test',
        message: 'Test test',
      };
      await request(app).post('/contact').send(body).expect(400, { error: Error.InvalidBody });
    });
  });
});
