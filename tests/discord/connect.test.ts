import request from 'supertest';
import { UserType } from '@prisma/client';
import database from '../../src/services/database';
import { User, Error } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import app from '../../src/app';
import env from '../../src/utils/env';
import { encrypt } from '../../src/utils/helpers';
import { sandbox } from '../setup';
import * as discordService from '../../src/services/discord';

describe('GET /discord/connect', () => {
  let user: User;
  let token: string;

  before(async () => {
    user = await createFakeUser({ type: UserType.player });
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

  it('should return an internal server error', () => {
    sandbox.stub(discordService, 'generateUserOAuthLink').throws('Unexpected error');

    return request(app)
      .get('/discord/connect')
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should generate proper url', () =>
    request(app)
      .get('/discord/connect')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, {
        link: `${env.discord.apiUrl}/oauth2/authorize?client_id=${env.discord.client}&redirect_uri=${encodeURIComponent(
          env.discord.oauthCallback,
        )}&response_type=code&scope=identify&state=${encodeURIComponent(encrypt(user.id).toString('base64'))}`,
      }));
});
