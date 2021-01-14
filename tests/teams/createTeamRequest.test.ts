import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeConfirmedUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/user';

describe('POST /teams/:teamId/joinRequests', () => {
  let user: User;
  let token: string;
  let team: Team;

  before(async () => {
    team = await createFakeTeam();
    user = await createFakeConfirmedUser();
    token = generateToken(user);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the team does not exists', async () => {
    await request(app)
      .post(`/teams/1A2B3C/joinRequests`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TeamNotFound });
  });

  it('should fail because the token is not provided', async () => {
    await request(app).post(`/teams/${team.id}/joinRequests`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is already in a team', async () => {
    const otherTeam = await createFakeTeam();
    const [localUser] = otherTeam.users;

    const localToken = generateToken(localUser);

    await request(app)
      .post(`/teams/${team.id}/joinRequests`)
      .set('Authorization', `Bearer ${localToken}`)
      .expect(409, { error: Error.AlreadyInTeam });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'askJoinTeam').throws('Unexpected error');
    await request(app)
      .post(`/teams/${team.id}/joinRequests`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.Unknown });
  });

  it('should succesfully request to join a team', async () => {
    const response = await request(app)
      .post(`/teams/${team.id}/joinRequests`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.askingTeamId).to.be.equal(team.id);
  });

  it('should failed as we already asked for the same team', async () => {
    await request(app)
      .post(`/teams/${team.id}/joinRequests`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409, { error: Error.AlreadyAskedATeam });
  });

  it('should failed as we already asked another team', async () => {
    const otherTeam = await createFakeTeam();

    await request(app)
      .post(`/teams/${otherTeam.id}/joinRequests`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409, { error: Error.AlreadyAskedATeam });
  });
});
