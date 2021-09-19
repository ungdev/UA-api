import nock from 'nock';
import request from 'supertest';
import axios from 'axios';
import app from '../../src/app';
import { createFakeUser } from '../utils';
import type { DiscordAuthorizationData, DiscordToken } from '../../src/controllers/discord/discordApi';
import database from '../../src/services/database';
import { User } from '../../src/types';
import { encrypt } from '../../src/utils/helpers';
import env from '../../src/utils/env';
import { updateAdminUser } from '../../src/operations/user';

describe('GET /discord/oauth', () => {
  let user: User;
  let authorized: boolean;
  let remoteUserId = '1420070400000';
  const scope = 'identify';

  before(async () => {
    authorized = false;
    // eslint-disable-next-line global-require
    axios.defaults.adapter = require('axios/lib/adapters/http');
    user = await createFakeUser();
    nock('https://discord.com')
      .persist()
      .post('/api/v9/oauth2/token')
      .reply(200, <DiscordToken>{
        scope,
        expires_in: Date.now() + 1000,
        access_token: 'ZFGFHAGFJZF27672T82H1FSBS',
        refresh_token: 'BNAZHI282781Jhg276hHG2Gdvhno2==',
        token_type: 'Bearer',
      })
      .get('/api/v9/oauth2/@me')
      .reply(
        200,
        () =>
          <DiscordAuthorizationData>{
            scopes: [scope],
            expires: new Date(Date.now() + 10000).toISOString(),
            user:
              authorized === true
                ? {
                    id: remoteUserId,
                    username: 'RandomUser',
                    discriminator: '0000',
                    avatar: 'emptylink',
                    public_flags: 0,
                  }
                : undefined,
            application: {
              id: '1420070400000',
              name: 'UTT Arena',
              icon: 'emptylink',
              description: '',
              summary: '',
              hook: false,
              bot_public: false,
              bot_require_code_grant: false,
              verify_key: '',
            },
          },
      );
  });

  after(() => {
    nock.restore();
    database.user.deleteMany();
  });

  it('should fail because an error was returned from oauth2/authorize', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        error: 'The oauth was cancelled',
        error_description: 'Description of this error here',
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=4`));

  it('should fail because no query params were provided', () =>
    request(app)
      .get('/discord/oauth')
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=5`));

  it('should fail because query params were incomplete', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: '676yggh2989279ghj==',
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=5`));

  it('should fail because the state used matches no user id', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: '676yggh2989279ghj==',
        state: encrypt(user.id).toString('base64').slice(1),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=5`));

  it('should fail because the state matches another user id or discord sent an error', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: '676yggh2989279ghj==',
        state: encrypt(user.id.slice(1)).toString('base64').slice(1),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=5`));

  it('should fail when oauth is cancelled', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: 'GHFGJF87286UGJHFH',
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=4`));

  it('should indicate the discord account was not linked already', async () => {
    authorized = true;
    await updateAdminUser(user.id, { discordId: null });
    return request(app)
      .get('/discord/oauth')
      .query({
        code: 'GHFGJF87286UGJHFH',
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=0`);
  });

  it('should indicate the linked account is still the same', () =>
    request(app)
      .get('/discord/oauth')
      .query({
        code: 'GHFGJF87286UGJHFH',
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=2`));

  it('should indicate the linked account has been updated', () => {
    remoteUserId = '1420070400001';
    return request(app)
      .get('/discord/oauth')
      .query({
        code: 'GHFGJF87286UGJHFH',
        state: encrypt(user.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=1`);
  });

  it('should fail if discord account is already bound to another account', async () => {
    const otherUser = await createFakeUser();
    return request(app)
      .get('/discord/oauth')
      .query({
        code: 'GHFGJF87286UGJHFH',
        state: encrypt(otherUser.id).toString('base64'),
      })
      .expect(302)
      .expect('Location', `${env.front.website}/dashboard/account?action=oauth&state=3`);
  });
});
