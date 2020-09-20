import chai from 'chai';
import request from 'supertest';
import app from '../src/app';
import database from '../src/utils/database';

chai.should();

describe('General API', () => {
  describe('GET /', () => {
    it('should return 200 with an object', async () => {
      await request(app).get('/').expect(200, { shop: false, login: false });
    });
    it('should return the updated value', async () => {
      await database.settings.update({
        where: {
          id: 'login',
        },
        data: {
          value: 'true',
        },
      });
      await request(app).get('/').expect(200, { shop: false, login: true });
    });
    it('should not accept POST request', async () => {
      await request(app).post('/').expect(404);
    });
  });
});
