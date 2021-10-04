/* eslint-disable arrow-body-style */
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as discordFunctions from '../../src/utils/discord';
import { Error } from '../../src/types';
import env from '../../src/utils/env';

describe('POST /discord/sync-roles', () => {
  const token = env.discord.syncKey;

  it('should fail because the token is not provided', () => {
    return request(app).post('/discord/sync-roles').expect(401, { error: Error.NoToken });
  });

  it('should fail because the provided token is invalid', () => {
    return request(app).post('/discord/sync-roles').send({ token: 'e' }).expect(401, { error: Error.InvalidToken });
  });

  it('should fail with an internal server error', () => {
    sandbox.stub(discordFunctions, 'syncRoles').throws('Unexpected error');
    return request(app).post('/discord/sync-roles').send({ token }).expect(500, { error: Error.InternalServerError });
  });

  it('should succesfully sync roles', () => {
    return request(app).post('/discord/sync-roles').send({ token }).expect(204);
  });
});
