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
import {
  DiscordChannel,
  DiscordCreateChannelRequest,
  DiscordCreateRoleRequest,
  DiscordGuildMember,
  DiscordRole,
} from '../../src/controllers/discord/discordApi';
import { fetchTournament } from '../../src/operations/tournament';

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

    const tournament = await fetchTournament(team.tournamentId);

    env.discord.token = 'test-token';
    env.discord.server = generateFakeDiscordId();

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

    for (const member of [...team.players, ...team.coaches]) {
      nocked.put(`/guilds/${env.discord.server}/members/${member.discordId}/roles/${team.discordRoleId}`).reply(204);
      nocked
        .put(`/guilds/${env.discord.server}/members/${member.discordId}/roles/${tournament.discordRoleId}`)
        .reply(204);
    }
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
