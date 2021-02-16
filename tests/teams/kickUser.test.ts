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

describe.only('DELETE /teams/:teamId/users/:userId', () => {
  let userToKick: User;

  let userToKickToken: string;
  let team: Team;

  before(async () => {
    team = await createFakeTeam({ members: 3 });

    // Find a user that is not a captain
    userToKick = team.players.find((player) => player.id !== team.captainId);
    userToKickToken = generateToken(userToKick);
  });

  after(async () => {
    await database.log.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app).delete(`/teams/${team.id}/users/${userToKick.id}`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the team does not exists', async () => {
    await request(app)
      .delete(`/teams/1A2B3C/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${userToKickToken}`)
      .expect(404, { error: Error.TeamNotFound });
  });

  it('should fail because the user is a random with no rights', async () => {
    const randomUser = await createFakeUser();
    const randomUserToken = generateToken(randomUser);

    await request(app)
      .delete(`/teams/${team.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${randomUserToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it('should fail because the user is a member of the team but not the captain or not the user', async () => {
    const member = team.players.find((teamUsers) => teamUsers.id !== team.captainId && teamUsers.id !== userToKick.id);
    const memberToken = generateToken(member);

    await request(app)
      .delete(`/teams/${team.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it('should fail as the user is the captain of another team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .delete(`/teams/${team.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'kickUser').throws('Unexpected error');
    await request(app)
      .delete(`/teams/${team.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${userToKickToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the user has selected a wrong team', async () => {
    const otherTeam = await createFakeTeam();

    await request(app)
      .delete(`/teams/${otherTeam.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${userToKickToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail because the user tried to remove itself as a captain', async () => {
    const captain = getCaptain(team);
    const captainToken = generateToken(captain);

    await request(app)
      .delete(`/teams/${team.id}/users/${captain.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.CaptainCannotQuit });
  });

  it('should error as the team is locked', async () => {
    const lockedTeam = await createFakeTeam({ members: 5, locked: true });
    const lockedCaptain = getCaptain(lockedTeam);
    const lockedToken = generateToken(lockedCaptain);

    await request(app)
      .delete(`/teams/${lockedTeam.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${lockedToken}`)
      .expect(403, { error: Error.TeamLocked });
  });

  it('should succesfully quit the team (as itself)', async () => {
    await request(app)
      .delete(`/teams/${team.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${userToKickToken}`)
      .expect(204);

    const removedUser = await fetchUser(userToKick.id);

    expect(removedUser.teamId).to.be.null;

    // Rejoin the team for next tests
    await teamOperations.joinTeam(team.id, removedUser);
  });

  it('should succesfully kick the user (as the captain of the team)', async () => {
    const captain = getCaptain(team);
    const captainToken = generateToken(captain);

    await request(app)
      .delete(`/teams/${team.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(204);

    const kickedUser = await fetchUser(userToKick.id);
    expect(kickedUser.teamId).to.be.null;
  });

  it('should fail as the user has already been kicked', async () => {
    await request(app)
      .delete(`/teams/${team.id}/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${userToKickToken}`)
      .expect(403, { error: Error.NotInTeam });
  });
});
