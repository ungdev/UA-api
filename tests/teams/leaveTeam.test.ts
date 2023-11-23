import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error, Team, User, UserType } from '../../src/types';
import { createFakeTeam, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import * as userOperations from '../../src/operations/user';
import { getCaptain } from '../../src/utils/teams';

describe('DELETE /teams/current/users/current', () => {
  let user: User;
  let coach: User;

  let token: string;
  let coachToken: string;

  let team: Team;
  let waitingTeam: Team;

  before(async () => {
    const tournament = await tournamentOperations.fetchTournament('rl');
    team = await createFakeTeam({ members: tournament.playersPerTeam, locked: true, paid: true, tournament: 'rl' });

    // Find a user that is not a captain
    user = team.players.find((player) => player.id !== team.captainId);
    token = generateToken(user);

    // Create a coach
    coach = await createFakeUser({ type: UserType.coach });
    coachToken = generateToken(coach);
    await teamOperations.joinTeam(team.id, coach, UserType.coach);

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
    // User have paid, so they each have a cart
    await database.cart.deleteMany();
    await database.orga.deleteMany();
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

  it('should successfully quit the team, but not unlock the team as the user is a coach', async () => {
    // Verify the team is locked
    let databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.not.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    // Make the request
    await request(app).delete('/teams/current/users/current').set('Authorization', `Bearer ${coachToken}`).expect(204);

    // Verify the user has been removed from the team
    const removedUser = await userOperations.fetchUser(coach.id);
    expect(removedUser.teamId).to.be.null;
    expect(removedUser.type).to.be.null;

    // Verify the team is still locked
    databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.not.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    // Verify the waiting team is still in the queue
    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.null;
    expect(waitingTeam.enteredQueueAt).to.be.not.null;
  });

  it('should successfully quit the team and unlock the team, and lock the waiting team', async () => {
    await request(app).delete('/teams/current/users/current').set('Authorization', `Bearer ${token}`).expect(204);

    const removedUser = await userOperations.fetchUser(user.id);

    expect(removedUser.teamId).to.be.null;
    expect(removedUser.type).to.be.null;

    // Verify the team has been unlocked
    const databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    // Verify the waiting team has been locked
    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.not.null;
    expect(waitingTeam.enteredQueueAt).to.be.null;

    // Rejoin the team for next tests
    await teamOperations.joinTeam(team.id, removedUser, UserType.player);
  });
});
