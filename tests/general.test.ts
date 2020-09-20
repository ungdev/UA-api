import request from 'supertest';
import app from '../src/app';
import database from '../src/utils/database';

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
  describe.skip('POST /contact', () => {
    it('should send the message with a 204', async () => {
      const body = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@test.com',
        subject: 'Test',
        message: 'Test test',
      };
      await request(app).post('/contact').send(body).expect(204);
    });
    it('should not accept wrong email', async () => {
      const body = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'wrong email',
        subject: 'Test',
        message: 'Test test',
      };
      await request(app).post('/contact').send(body).expect(400);
    });
    it('should not accept missing parameters in body', async () => {
      const body = {
        firstname: 'John',
        subject: 'Test',
        message: 'Test test',
      };
      await request(app).post('/contact').send(body).expect(400);
    });
  });
});
