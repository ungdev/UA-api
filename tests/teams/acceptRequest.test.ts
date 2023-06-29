import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as cartOperations from '../../src/operations/carts';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error, Team, User, UserType } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';
import { fetchUser } from '../../src/operations/user';
import { getCaptain } from '../../src/utils/teams';

// eslint-disable-next-line func-names
describe('POST /teams/current/join-requests/:userId', function () {
  // Setup is slow
  this.timeout(20000);

  let user: User;
  let user2: User;
  let team: Team;
  let captain: User;
  let token: string;

  before(async () => {
    const tournament = await tournamentOperations.fetchTournament('lol');
    team = await createFakeTeam({ members: tournament.playersPerTeam - 2, paid: true });
    user = await createFakeUser({ paid: true, type: UserType.player });
    user2 = await createFakeUser({ paid: true, type: UserType.player });
    await teamOperations.askJoinTeam(team.id, user.id, UserType.player);
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);
    // Fill the tournament
    // Store the promises
    const promises = [];
    for (let index = 0; index < tournament.placesLeft; index++) {
      promises.push(createFakeTeam({ members: tournament.playersPerTeam, paid: true, locked: true }));
    }
    await Promise.all(promises);
    // Update the team
    team = await teamOperations.fetchTeam(team.id);

    captain = getCaptain(team);
    token = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app).post(`/teams/current/join-requests/${user.id}`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is a random with no rights', async () => {
    const randomUser = await createFakeUser();
    const randomUserToken = generateToken(randomUser);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${randomUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail because the user is a member of the team but not the captain', async () => {
    const member = team.players.find((teamUsers) => teamUsers.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should fail as the user is the captain of another team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotAskedTeam });
  });

  it('should fail as the user does not exists', async () => {
    await request(app)
      .post(`/teams/current/join-requests/A12B3C`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'joinTeam').throws('Unexpected error');
    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the team is full', async () => {
    const fullTeam = await createFakeTeam({ members: 5 });
    const otherUser = await createFakeUser();

    const fullCaptain = getCaptain(fullTeam);
    const fullToken = generateToken(fullCaptain);
    await teamOperations.askJoinTeam(fullTeam.id, otherUser.id, UserType.player);

    await request(app)
      .post(`/teams/current/join-requests/${otherUser.id}`)
      .set('Authorization', `Bearer ${fullToken}`)
      .expect(403, { error: Error.TeamFull });
  });

  it('should succeed to join a full team as a coach', async () => {
    const fullTeam = await createFakeTeam({ members: 5 });
    const otherUser = await createFakeUser();

    const fullCaptain = getCaptain(fullTeam);
    const fullToken = generateToken(fullCaptain);
    await teamOperations.askJoinTeam(fullTeam.id, otherUser.id, UserType.coach);

    await request(app)
      .post(`/teams/current/join-requests/${otherUser.id}`)
      .set('Authorization', `Bearer ${fullToken}`)
      .expect(200);
  });

  it('should successfully join the team and not lock the team as it is not full', async () => {
    // Verify the team is not locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    const { body } = await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updatedUser = await fetchUser(user.id);

    expect(body.players).to.have.lengthOf(team.players.length + 1);
    expect(updatedUser.askingTeamId).to.be.null;

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
    // Verify the team has not been locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    // Update the team
    team = await teamOperations.fetchTeam(team.id);
  });

  it("should successfully join the team and not lock it as the user hasn't paid", async () => {
    // Make the user not pay
    const cart = await database.cart.findFirst({
      where: { cartItems: { some: { itemId: 'ticket-player', forUserId: user2.id } } },
      include: { cartItems: true },
    });
    await cartOperations.updateCart(cart.id, cart.transactionId, 'pending');

    await request(app)
      .post(`/teams/current/join-requests/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify the team has not been locked
    const databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    // Make the user pay again
    await cartOperations.updateCart(cart.id, cart.transactionId, 'paid');

    // Remove the user for the next test
    await teamOperations.kickUser(await fetchUser(user2.id));
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);
  });

  it('should successfully join the team and not lock it as not all players have paid', async () => {
    // Verify the team is not locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    // Make a user not pay
    const cart = await database.cart.findFirst({
      where: { cartItems: { some: { itemId: 'ticket-player', forUserId: user.id } } },
      include: { cartItems: true },
    });
    await cartOperations.updateCart(cart.id, cart.transactionId, 'pending');

    await request(app)
      .post(`/teams/current/join-requests/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    // Make the user pay again
    await cartOperations.updateCart(cart.id, cart.transactionId, 'paid');

    // Remove the user for the next test
    await teamOperations.kickUser(await fetchUser(user2.id));
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);
  });

  it('should successfully join the team and place it in the queue as the tournament is full', async () => {
    // Verify the team is not locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    const { body } = await request(app)
      .post(`/teams/current/join-requests/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updatedUser = await fetchUser(user2.id);

    expect(body.players).to.have.lengthOf(team.players.length + 1);
    expect(updatedUser.askingTeamId).to.be.null;

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
    // Verify the team has been put into queue
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.not.null;

    // Remove the user for the next test
    await teamOperations.kickUser(await fetchUser(user2.id));
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);
  });

  it('should successfully join the team and lock it', async () => {
    // Verify the team is not locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    // Remove a team from the tournament
    const tournament = await tournamentOperations.fetchTournament('lol');
    const teamToRemove = tournament.teams.find((pTeam) => pTeam.id !== team.id);
    await teamOperations.unlockTeam(teamToRemove.id);

    await request(app)
      .post(`/teams/current/join-requests/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify the team has been locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.not.null;
    expect(team.enteredQueueAt).to.be.null;

    // Remove the user
    await teamOperations.kickUser(await fetchUser(user2.id));
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);

    // Readd the removed team from the tournament
    await teamOperations.lockTeam(teamToRemove.id);
  });

  it('should fail because the user is already in a team', async () => {
    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.AlreadyInTeam });
  });

  it('should fail because the user has not asked for a team', async () => {
    await teamOperations.kickUser(await fetchUser(user.id));
    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotAskedTeam });
  });
});
