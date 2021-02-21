import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/user';
import { fetchUser } from '../../src/operations/user';
import { getCaptain } from '../../src/utils/teams';

describe('DELETE /teams/:teamId/joinRequests/:userId', () => {
  let user: User;
  let token: string;
  let team: Team;

  before(async () => {
    team = await createFakeTeam({ members: 2 });
    user = await createFakeUser();
    await teamOperations.askJoinTeam(team.id, user.id);
    token = generateToken(user);
  });

  after(async () => {
    await database.log.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app)
      .delete(`/teams/${team.id}/joinRequests/${user.id}`)
      .expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the team does not exists', async () => {
    await request(app)
      .delete(`/teams/1A2B3C/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TeamNotFound });
  });

  it('should fail because the user is a random with no rights', async () => {
    const randomUser = await createFakeUser();
    const randomUserToken = generateToken(randomUser);

    await request(app)
      .delete(`/teams/${team.id}/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${randomUserToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it('should fail because the user is a member of the team but not the captain', async () => {
    const member = team.players.find((teamUsers) => teamUsers.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .delete(`/teams/${team.id}/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it('should fail as the user is the captain of another team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .delete(`/teams/${team.id}/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'cancelTeamRequest').throws('Unexpected error');
    await request(app)
      .delete(`/teams/${team.id}/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should succesfully cancel the team joining (as itself)', async () => {
    await request(app)
      .delete(`/teams/${team.id}/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const deletedRequestUser = await fetchUser(user.id);

    expect(deletedRequestUser.askingTeamId).to.be.null;

    await teamOperations.askJoinTeam(team.id, user.id);
  });

  it('should error as the team is locked', async () => {
    const lockedTeam = await createFakeTeam({ members: 5, locked: true });
    const lockedCaptain = getCaptain(lockedTeam);
    const lockedToken = generateToken(lockedCaptain);

    await request(app)
      .delete(`/teams/current/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${lockedToken}`)
      .expect(403, { error: Error.TeamLocked });
  });

  it('should succesfully cancel the team joining (as the captain of the team)', async () => {
    const captain = getCaptain(team);
    const captainToken = generateToken(captain);

    await request(app)
      .delete(`/teams/current/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(204);
    const deletedRequestUser = await fetchUser(user.id);
    expect(deletedRequestUser.askingTeamId).to.be.null;
  });

  it('should fail as the user has removed the request', async () => {
    await request(app)
      .delete(`/teams/current/joinRequests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotAskedTeam });
  });
});
