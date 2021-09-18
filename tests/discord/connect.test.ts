import request from 'supertest';
import database from '../../src/services/database';
import { User, Error } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import app from '../../src/app';
import env from '../../src/utils/env';
import { encrypt } from '../../src/utils/helpers';

describe('GET /discord/connect', () => {
  let user: User;
  let token: string;

  before(async () => {
    user = await createFakeUser();
    token = generateToken(user);
    env.discord.client = '01234567890123';
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
    delete env.discord.client;
  });

  it('should fail if user is not authenticated', () =>
    request(app).get('/discord/connect').expect(401, { error: Error.Unauthenticated }));

  it('should generate proper url', () =>
    request(app)
      .get('/discord/connect')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, {
        link: `${env.discord.oauthUrl}/authorize?client_id=${env.discord.client}&redirect_uri=${encodeURIComponent(
          env.discord.oauthCallback,
        )}&response_type=code&scope=identify&state=${encodeURIComponent(encrypt(user.id).toString('base64'))}`,
      }));
});
