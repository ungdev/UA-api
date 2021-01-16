import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/user';
import { getCaptain } from '../../src/utils/teams';

describe('GET /teams/:teamId', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;

  before(async () => {
    team = await createFakeTeam(2);

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it("should error as the team id doesn't exists", async () => {
    await request(app)
      .get('/teams/A1B2C3')
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.NotInTeam }); // Unfortunately, we use a 403 because the middleware thinks you don't have access to this ressource
  });

  it('should error as the token is missing', async () => {
    await request(app).get(`/teams/${team.id}`).send({ name: 'yolo' }).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the request is not logged as the captain of his team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .get(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should succeed as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    const response = await request(app)
      .get(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(response.body.name).to.be.equal(team.name);
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(teamOperations, 'fetchTeam').throws('Unknown error');

    await request(app)
      .get(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.Unknown });
  });

  it('should succeed as the captain', async () => {
    const response = await request(app)
      .get(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    expect(response.body.name).to.be.equal(team.name);
  });
});
