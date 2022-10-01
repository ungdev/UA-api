import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as responses from '../../src/utils/responses';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { getCaptain } from '../../src/utils/teams';

describe('GET /teams/:teamId', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;

  before(async () => {
    team = await createFakeTeam({ members: 2 });

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(responses, 'success').throws('Unknown error');

    await request(app)
      .get(`/teams/` + team.id)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should succeed as the captain', async () => {
    const { body } = await request(app)
      .get(`/teams/` + team.id)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    expect(body.name).to.be.equal(team.name);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });
});
