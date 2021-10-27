/* eslint-disable arrow-body-style */
import request from 'supertest';
import nock from 'nock';
import axios from 'axios';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as discordFunctions from '../../src/utils/discord';
import { Error } from '../../src/types';
import env from '../../src/utils/env';
import database from '../../src/services/database';
import { createFakeTeam, generateFakeDiscordId } from '../utils';
import { DiscordGuildMember } from '../../src/controllers/discord/discordApi';

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
      tournament: 'csgo',
    });

    const team2 = await createFakeTeam({
      locked: false,
      members: 2,
      tournament: 'csgo',
    });

    env.discord.token = 'test-token';
    env.discord.server = generateFakeDiscordId();

    await database.tournament.update({
      where: {
        id: 'csgo',
      },
      data: {
        discordRoleId: generateFakeDiscordId(),
      },
    });

    nock('https://discord.com/api/v9')
      .persist()
      .get(/\/guilds\/\d+\/members/)
      .query(true)
      .reply(() => {
        const rateLimitHeader = {
          'X-RateLimit-Limit': 5,
          'x-Ratelimit-Reset-After': 0,
          'X-RateLimit-Remaining': rateLimitRemain < 0 ? (rateLimitRemain = 5) : rateLimitRemain--,
        } as unknown as nock.ReplyHeaders;
        return [200, <DiscordGuildMember[]>[...team.players.slice(1), ...team.coaches, team2.players[0]].map(
            (user) => ({
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
            }),
          ), rateLimitHeader];
      })
      .put(/\/guilds\/\d+\/members\/\d+\/roles\/\d+/)
      .reply(() => {
        const rateLimitHeader = {
          'X-RateLimit-Limit': 5,
          'x-Ratelimit-Reset-After': 0,
          'X-RateLimit-Remaining': rateLimitRemain < 0 ? (rateLimitRemain = 5) : rateLimitRemain--,
        } as unknown as nock.ReplyHeaders;
        return [204, null, rateLimitHeader];
      });
  });

  after(async () => {
    nock.cleanAll();
    delete env.discord.token;
    delete env.discord.server;
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

  it('should succesfully sync roles', async () => {
    const { body } = await request(app).post('/discord/sync-roles').send({ token }).expect(200);
    expect(Array.isArray(body.logs)).to.be.equal(true);
  });
});
