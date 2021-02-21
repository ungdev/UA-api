import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as responses from '../../src/utils/responses';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/user';
import { getCaptain } from '../../src/utils/teams';

describe('GET /teams/current', () => {
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

  it('should error as the token is missing', async () => {
    await request(app).get(`/teams/current`).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the logged user is not is a team', async () => {
    const otherUser = await createFakeUser();
    const otherUserToken = generateToken(otherUser);

    await request(app)
      .get(`/teams/current`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should succeed as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    const response = await request(app).get(`/teams/current`).set('Authorization', `Bearer ${memberToken}`).expect(200);

    expect(response.body.name).to.be.equal(team.name);
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(responses, 'success').throws('Unknown error');

    await request(app)
      .get(`/teams/current`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should succeed as the captain', async () => {
    const { body } = await request(app)
      .get(`/teams/current`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    expect(body.name).to.be.equal(team.name);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });
});
