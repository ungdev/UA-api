import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User, UserType } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';
import { fetchUser } from '../../src/operations/user';
import { getCaptain } from '../../src/utils/teams';

describe('DELETE /teams/current/join-requests/:userId', () => {
  let user: User;
  let captain: User;
  let captainToken: string;
  let team: Team;

  before(async () => {
    team = await createFakeTeam({ members: 2 });
    user = await createFakeUser({ type: UserType.player });
    await teamOperations.askJoinTeam(team.id, user.id, UserType.player);

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.orga.deleteMany();
await database.user.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app).delete(`/teams/current/join-requests/${user.id}`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is a random with no rights', async () => {
    const randomUser = await createFakeUser({ type: UserType.player });
    const randomUserToken = generateToken(randomUser);

    await request(app)
      .delete(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${randomUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail because the user is a member of the team but not the captain', async () => {
    const member = team.players.find((teamUsers) => teamUsers.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .delete(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should fail as the user is unknown', async () => {
    await request(app)
      .delete(`/teams/current/join-requests/A12BC3`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail as the user is the captain of another team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .delete(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotAskedTeam });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'deleteTeamRequest').throws('Unexpected error');
    await request(app)
      .delete(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should succesfully cancel the team joining', async () => {
    await request(app)
      .delete(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(204);
    const deletedRequestUser = await fetchUser(user.id);
    expect(deletedRequestUser.askingTeamId).to.be.null;
    expect(deletedRequestUser.type).to.be.null;
  });

  it('should fail as the user has removed the request', async () => {
    await request(app)
      .delete(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.NotAskedTeam });
  });
});
