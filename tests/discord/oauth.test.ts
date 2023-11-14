import request from 'supertest';
import * as sentryOperations from '@sentry/node';
import app from '../../src/app';
import { createFakeUser, generateFakeDiscordId } from '../utils';
import database from '../../src/services/database';
import { User } from '../../src/types';
import { encrypt } from '../../src/utils/helpers';
import env from '../../src/utils/env';
import { updateAdminUser } from '../../src/operations/user';
import { registerOauthCode, resetFakeDiscord } from '../discord';
import { sandbox } from '../setup';
import { UserType } from "@prisma/client";

describe('GET /discord/oauth', () => {
  let user: User;
  let discordId: string;

  before(async () => {
    user = await createFakeUser({type: UserType.player});
  });

  after(() => {
    resetFakeDiscord();
    return database.user.deleteMany();
  });

  it('should fail because an error was returned from oauth2/authorize', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        error: 'The oauth was cancelled',
        error_description: 'Description of this error here',
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/4`));

  it('should fail because no query params were provided', () =>
    request(app).get('/discord/oauth').expect(302).expect('Location', `${env.front.website}/oauth/discord/5`));

  it('should fail because query params were incomplete', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/5`));

  it('should fail because the state used matches no user id', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(true),
        state: encrypt(user.id).toString('base64').slice(1),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/5`));

  it('should fail with an unknown error', async () => {
    const stub = sandbox.stub(sentryOperations, 'setExtra').throws('Stub!');
    await request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(),
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/6`);
    return stub.restore();
  });

  it('should fail because the state matches another user id or discord sent an error', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(true),
        state: encrypt(user.id.slice(1)).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/5`));

  it('should fail when oauth is cancelled', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(),
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/4`));

  it('should indicate the discord account was not linked already', async () => {
    await updateAdminUser(user.id, { discordId: null });
    discordId = generateFakeDiscordId();
    return request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(true, discordId),
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/0`);
  });

  it('should indicate the linked account is still the same', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(true, discordId),
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/2`));

  it('should indicate the linked account has been updated', () => {
    discordId = generateFakeDiscordId();
    return request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(true, discordId),
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/1`);
  });

  it('should fail if discord account is already bound to another account', async () => {
    const otherUser = await createFakeUser({type: UserType.player});
    return request(app)
      .get('/discord/oauth')
      .query({
        code: registerOauthCode(true, discordId),
        state: encrypt(otherUser.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/oauth/discord/3`);
  });
});
