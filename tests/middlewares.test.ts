import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app';
import database from '../src/services/database';
import { Error, UserType } from '../src/types';
import { generateToken } from '../src/utils/users';
import { createFakeUser } from './utils';
import env from '../src/utils/env';

// Test cases that are not tested in common routes
describe('Test middlewares', () => {
  after(async () => {
    await database.user.deleteMany();
  });

  describe('Test rate limiter', () => {
    it('should return a too many requests error', async () => {
      delete require.cache[require.resolve('../src/app')];
      delete require.cache[require.resolve('../src/utils/env')];
      // Backup the environment variables
      const envBackup = { ...process.env };
      process.env.NODE_ENV = 'development';
      const { default: nonTestApp } = await import('../src/app');
      await Promise.all(Array.from({ length: 12 }).map(() => request(nonTestApp).get('/').expect(200)));
      await request(nonTestApp).get('/').expect(429, 'Too Many Requests');
      // ANNNNNDDDD... for some reason you don't need to delete the new cache :)
      // We still need to rollback the process.env tho
      process.env = envBackup;
    });
  });

  describe('Test general middleware', () => {
    it('should return a not found error', () =>
      request(app).get('/randomRoute').expect(404, { error: Error.RouteNotFound }));
  });

  describe('Test JSON middleware', () => {
    it('should not accept incorrect media type (sending text/plain)', async () => {
      await request(app)
        .post('/auth/register')
        .send('mange tes morts')
        .expect(415, { error: Error.UnsupportedMediaType });
    });

    it('should not accept incorrect json type', async () => {
      await request(app)
        .post('/auth/register')
        .send('mange tes morts')
        .set('Content-Type', 'application/json')
        .expect(400, { error: Error.MalformedBody });
    });
  });

  describe('Test authentication middleware', () => {
    it("should reject a wrong token because it's invalid", async () => {
      const token = jwt.sign({ userId: 'A1B2C3' }, 'otherSecret', {
        expiresIn: env.jwt.expires,
      });

      await request(app).get('/').set('Authorization', `Bearer ${token}`).expect(401, { error: Error.InvalidToken });
    });

    it("should reject a wrong token because it's expired", async () => {
      const token = jwt.sign({ userId: 'A1B2C3' }, env.jwt.secret!, {
        expiresIn: '1ms',
      });

      await new Promise((resolve, reject) => {
        setTimeout(() => {
          request(app)
            .get('/')
            .set('Authorization', `Bearer ${token}`)
            .expect(401, { error: Error.ExpiredToken })
            .then(resolve)
            .catch(reject);
        }, 5);
      });
    });

    // This case should never happen. (Auth as a deleted user)
    it('should tell the user does not exists', async () => {
      const token = jwt.sign({ userId: 'A1B2C3' }, env.jwt.secret!, {
        expiresIn: env.jwt.expires,
      });

      await request(app).get('/').set('Authorization', `Bearer ${token}`).expect(404, { error: Error.UserNotFound });
    });

    // This case should never happen. (Authenticated as a not confirmed user (has to login before))
    it('should tell the user is not confirmed', async () => {
      const user = await createFakeUser({ confirmed: false });
      const token = generateToken(user);

      await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token}`)
        .expect(403, { error: Error.EmailNotConfirmed });
    });

    // This case should never happen
    it('should error because the user is a attendant', async () => {
      const user = await createFakeUser({ type: UserType.attendant });
      const token = generateToken(user);

      await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token}`)
        .expect(403, { error: Error.LoginAsAttendant });
    });
  });

  describe('Test validation middleware', () => {
    it('should error as we submit a query array', () =>
      request(app).get('/?a=1&a=2').expect(400, { error: Error.InvalidQueryParameters }));

    it('should error as we submit a query object', () =>
      request(app).get('/?a[b]=1').expect(400, { error: Error.InvalidQueryParameters }));
  });
});
