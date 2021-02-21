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

describe('DELETE /teams/current/joinRequests/current', () => {
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
    await request(app).delete('/teams/current/joinRequests/current').expect(401, { error: Error.Unauthenticated });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'deleteTeamRequest').throws('Unexpected error');
    await request(app)
      .delete('/teams/current/joinRequests/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should succesfully cancel the team joining', async () => {
    await request(app)
      .delete('/teams/current/joinRequests/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const deletedRequestUser = await fetchUser(user.id);

    expect(deletedRequestUser.askingTeamId).to.be.null;
  });

  it('should fail as the user has removed the request', async () => {
    await request(app)
      .delete('/teams/current/joinRequests/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotAskedTeam });
  });
});
