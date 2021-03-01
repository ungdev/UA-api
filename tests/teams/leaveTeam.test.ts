import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';
import { fetchUser } from '../../src/operations/user';
import { getCaptain } from '../../src/utils/teams';

describe('DELETE /teams/current/users/current', () => {
  let user: User;

  let token: string;
  let team: Team;

  before(async () => {
    team = await createFakeTeam({ members: 3 });

    // Find a user that is not a captain
    user = team.players.find((player) => player.id !== team.captainId);
    token = generateToken(user);
  });

  after(async () => {
    await database.log.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app).delete('/teams/current/users/current').expect(401, { error: Error.Unauthenticated });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'kickUser').throws('Unexpected error');
    await request(app)
      .delete('/teams/current/users/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail because the user tried to remove itself as a captain', async () => {
    const captain = getCaptain(team);
    const captainToken = generateToken(captain);

    await request(app)
      .delete('/teams/current/users/current')
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.CaptainCannotQuit });
  });

  it('should error as the team is locked', async () => {
    const lockedTeam = await createFakeTeam({ members: 5, locked: true });
    const lockedCaptain = getCaptain(lockedTeam);
    const lockedToken = generateToken(lockedCaptain);

    await request(app)
      .delete('/teams/current/users/current')
      .set('Authorization', `Bearer ${lockedToken}`)
      .expect(403, { error: Error.TeamLocked });
  });

  it('should succesfully quit the team', async () => {
    await request(app).delete('/teams/current/users/current').set('Authorization', `Bearer ${token}`).expect(204);

    const removedUser = await fetchUser(user.id);

    expect(removedUser.teamId).to.be.null;

    // Rejoin the team for next tests
    await teamOperations.joinTeam(team.id, removedUser);
  });
});
