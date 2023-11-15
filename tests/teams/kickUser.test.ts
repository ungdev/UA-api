import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error, Team, User, UserType } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';
import * as userOperations from '../../src/operations/user';
import { getCaptain } from '../../src/utils/teams';

describe('DELETE /teams/current/users/:userId', () => {
  let userToKick: User;
  let coachToKick: User;

  let captainToken: string;
  let team: Team;
  let waitingTeam: Team;

  before(async () => {
    const tournament = await tournamentOperations.fetchTournament('rl');
    team = await createFakeTeam({ members: tournament.playersPerTeam, paid: true, locked: true, tournament: 'rl' });

    // Find a user that is not a captain
    userToKick = team.players.find((player) => player.id !== team.captainId);
    coachToKick = await createFakeUser({ type: 'coach' });
    teamOperations.joinTeam(team.id, coachToKick, UserType.coach);

    const captain = getCaptain(team);
    captainToken = generateToken(captain);

    // Fill the tournament
    const promises = [];
    for (let index = 0; index < tournament.placesLeft - 1; index++) {
      promises.push(createFakeTeam({ members: tournament.playersPerTeam, locked: true, paid: true, tournament: 'rl' }));
    }
    await Promise.all(promises);

    // Create a team that is in the waiting list
    waitingTeam = await createFakeTeam({
      members: tournament.playersPerTeam,
      locked: false,
      paid: true,
      tournament: 'rl',
    });
    await teamOperations.lockTeam(waitingTeam.id);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app).delete(`/teams/current/users/${userToKick.id}`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is a random with no rights', async () => {
    const randomUser = await createFakeUser({ type: UserType.player });
    const randomUserToken = generateToken(randomUser);

    await request(app)
      .delete(`/teams/current/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${randomUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail because the user is a member of the team but not the captain or not the user', async () => {
    const member = team.players.find((teamUsers) => teamUsers.id !== team.captainId && teamUsers.id !== userToKick.id);
    const memberToken = generateToken(member);

    await request(app)
      .delete(`/teams/current/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should fail as the user is the captain of another team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .delete(`/teams/current/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'kickUser').throws('Unexpected error');
    await request(app)
      .delete(`/teams/current/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail because the user tried to remove itself as a captain', async () => {
    const captain = getCaptain(team);

    await request(app)
      .delete(`/teams/current/users/${captain.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.CaptainCannotQuit });
  });

  it('should error as the user does not exists', async () => {
    await request(app)
      .delete(`/teams/current/users/A12B3C`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should successfully kick the user (as the captain of the team and as a player), and not unlock the team as the user is a coach', async () => {
    // Verify that the team is locked
    let databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.not.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    await request(app)
      .delete(`/teams/current/users/${coachToKick.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(204);

    const kickedUser = await userOperations.fetchUser(coachToKick.id);
    expect(kickedUser.teamId).to.be.null;
    expect(kickedUser.type).to.be.null;
    databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.not.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    // Rejoin the team for next tests
    await teamOperations.joinTeam(team.id, kickedUser, UserType.player);

    // Verify the waiting team is still in the queue
    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.null;
    expect(waitingTeam.enteredQueueAt).to.be.not.null;
  });

  it('should successfully kick the user (as the captain of the team and as a coach), and unlock the team', async () => {
    const captain = getCaptain(team);

    // Set the captain to a coach
    await database.user.update({ data: { type: UserType.coach }, where: { id: captain.id } });

    await request(app)
      .delete(`/teams/current/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(204);

    const kickedUser = await userOperations.fetchUser(userToKick.id);
    expect(kickedUser.teamId).to.be.null;
    expect(kickedUser.type).to.be.null;
    // Verify the team has been unlocked
    const databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    // Verify the waiting team has been locked
    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.not.null;
    expect(waitingTeam.enteredQueueAt).to.be.null;
  });

  it('should fail as the user has already been kicked', async () => {
    await request(app)
      .delete(`/teams/current/users/${userToKick.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.NotInTeam });
  });
});
