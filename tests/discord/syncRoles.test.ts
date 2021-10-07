/* eslint-disable arrow-body-style */
import request from 'supertest';
import nock from 'nock';
import axios from 'axios';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as discordFunctions from '../../src/utils/discord';
import { Error } from '../../src/types';
import env from '../../src/utils/env';
import database from '../../src/services/database';
import { createFakeTeam } from '../utils';
import {
  DiscordChannel,
  DiscordCreateChannelRequest,
  DiscordCreateRoleRequest,
  DiscordGuildMember,
  DiscordRole,
} from '../../src/controllers/discord/discordApi';

describe('POST /discord/sync-roles', () => {
  const token = env.discord.syncKey;
  // eslint-disable-next-line global-require
  axios.defaults.adapter = require('axios/lib/adapters/http');

  before(async () => {
    let rateLimitRemain = 5;
    const team = await createFakeTeam({
      locked: true,
      paid: true,
      members: 5,
    });
    env.discord.token = 'test-token';
    const nocked = nock('https://discord.com/api/v9')
      .persist()
      .get(`/guilds/${env.discord.server}/members`)
      .query(true)
      .reply(
        200,
        <DiscordGuildMember[]>[...team.players, ...team.coaches].map((user) => ({
          avatar: '',
          deaf: false,
          is_pending: false,
          mute: false,
          pending: false,
          premium_since: '',
          roles: [],
          user: {
            id: user.discordId,
          },
        })),
        {
          'X-RateLimit-Limit': 5,
          'X-RateLimit-Remaining': rateLimitRemain--,
          'X-RateLimit-Reset': Date.now() / 1000 + 60,
        } as unknown as nock.ReplyHeaders,
      )
      .post(`/guilds/${env.discord.server}/roles`)
      .reply(
        201,
        (...[, body]: [string, DiscordCreateRoleRequest]) =>
          <DiscordRole>{
            name: body.name,
            color: body.color,
            id: '1420070400000',
          },
      )
      .post(`/guilds/${env.discord.server}/channels`)
      .reply(
        201,
        (...[, body]: [string, DiscordCreateChannelRequest]) =>
          <DiscordChannel>{
            ...body,
            id: '1420070400000',
          },
      );
    for (const member of [...team.players, ...team.coaches])
      nocked.patch(`/guilds/${env.discord.server}/members/${member.discordId}`).reply(204, <DiscordGuildMember>{
        roles: [],
        avatar: '',
        deaf: false,
        is_pending: false,
        mute: false,
        pending: false,
        premium_since: '',
        user: {
          id: member.discordId,
        },
      });
  });

  after(async () => {
    nock.cleanAll();
    delete env.discord.token;
    await database.cart.deleteMany();
    await database.team.deleteMany();
    return database.user.deleteMany();
  });

  it('should fail because the token is not provided', () =>
    request(app).post('/discord/sync-roles').expect(401, { error: Error.NoToken }));

  it('should fail because the provided token is invalid', () =>
    request(app).post('/discord/sync-roles').send({ token: 'e' }).expect(401, { error: Error.InvalidToken }));

  it('should fail with an internal server error', async () => {
    const stub = sandbox.stub(discordFunctions, 'syncRoles').throws('Unexpected error');
    await request(app).post('/discord/sync-roles').send({ token }).expect(500, { error: Error.InternalServerError });
    return stub.restore();
  });

  it('should succesfully sync roles', () => request(app).post('/discord/sync-roles').send({ token }).expect(204));
});
