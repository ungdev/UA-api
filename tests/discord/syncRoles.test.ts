/* eslint-disable arrow-body-style */
import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as discordFunctions from '../../src/utils/discord';
import { Error } from '../../src/types';
import env from '../../src/utils/env';
import database from '../../src/services/database';
import { createFakeTeam } from '../utils';
import { registerMember, registerRole, resetFakeDiscord } from '../discord';

describe('POST /discord/sync-roles', () => {
  const token = env.discord.syncKey;

  before(async () => {
    const team = await createFakeTeam({
      locked: true,
      paid: true,
      members: 5,
      tournament: 'csgo',
    });
    // We will test with one missing user (he may have left the server)
    for (const user of [...team.players.slice(1), ...team.coaches]) registerMember(user.discordId);
    registerRole(team.discordRoleId);

    const team2 = await createFakeTeam({
      locked: false,
      members: 2,
      tournament: 'csgo',
    });
    registerMember(team2.players[0].discordId);

    await database.tournament.update({
      where: {
        id: 'csgo',
      },
      data: {
        discordRoleId: registerRole(),
      },
    });
  });

  after(async () => {
    resetFakeDiscord();
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

  it('should successfully sync roles', async () => {
    const { body } = await request(app).post('/discord/sync-roles').send({ token }).expect(200);
    expect(Array.isArray(body.logs)).to.be.equal(true);
  });

  it('should be idempotent', async () => {
    const { body } = await request(app).post('/discord/sync-roles').send({ token }).expect(200);
    expect(Array.isArray(body.logs)).to.be.equal(true);
  });
});
