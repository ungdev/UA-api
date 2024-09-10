import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as cartOperations from '../../src/operations/carts';
import * as tournamentOperations from '../../src/operations/tournament';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';
import { Error, Team, Tournament, User, UserType } from '../../src/types';
import { createFakeUser, createFakeTeam, createFakeTournament } from '../utils';
import { generateToken } from '../../src/utils/users';
import { getCaptain } from '../../src/utils/teams';
import { fetchUser } from '../../src/operations/user';

describe('POST /teams/current/join-requests/:userId', () => {
  let tournament: Tournament;
  let user: User;
  let user2: User;
  let user3: User;
  let coach2: User;
  let team: Team;
  let captain: User;
  let token: string;
  let fullTeam: Team;
  let fullCaptain: User;
  let fullToken: string;
  let onePlayerTeam: Team;
  let onePlayerTeamCaptain: User;
  let onePlayerTeamToken: string;

  before(async () => {
    tournament = await createFakeTournament({ playersPerTeam: 4, maxTeams: 3, coachesPerTeam: 1 });
    team = await createFakeTeam({ members: tournament.playersPerTeam - 2, paid: true, tournament: tournament.id });
    user = await createFakeUser({ paid: true, type: UserType.player });
    user2 = await createFakeUser({ paid: true, type: UserType.player });
    user3 = await createFakeUser({ paid: true, type: UserType.player });
    coach2 = await createFakeUser({ paid: true, type: UserType.coach });
    await teamOperations.askJoinTeam(team.id, user.id, UserType.player);
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);
    fullTeam = await createFakeTeam({
      members: tournament.playersPerTeam,
      paid: true,
      locked: true,
      tournament: tournament.id,
    });
    fullCaptain = getCaptain(fullTeam);
    fullToken = generateToken(fullCaptain);
    // Fill the tournament
    // Store the promises
    const promises = [];
    for (let index = 0; index < tournament.placesLeft; index++) {
      promises.push(
        createFakeTeam({ members: tournament.playersPerTeam, paid: true, locked: true, tournament: tournament.id }),
      );
    }
    await Promise.all(promises);
    // Update the team
    team = await teamOperations.fetchTeam(team.id);

    captain = getCaptain(team);
    token = generateToken(captain);

    const onePlayerTournament = await createFakeTournament({ coachesPerTeam: 1 });
    onePlayerTeam = await createFakeTeam({ tournament: onePlayerTournament.id });
    onePlayerTeamCaptain = getCaptain(onePlayerTeam);
    onePlayerTeamToken = generateToken(onePlayerTeamCaptain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.cart.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app).post(`/teams/current/join-requests/${user.id}`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is a random with no rights', async () => {
    const randomUser = await createFakeUser({ type: UserType.player });
    const randomUserToken = generateToken(randomUser);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${randomUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail because the user is a member of the team but not the captain', async () => {
    const member = team.players.find((teamUsers) => teamUsers.id !== team.captainId);
    const memberToken = generateToken(member!);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should fail as the user is the captain of another team', async () => {
    const otherTeam = await createFakeTeam({ tournament: tournament.id });
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
    const otherUser = await createFakeUser({ type: UserType.player });
    await teamOperations.askJoinTeam(fullTeam.id, otherUser.id, UserType.player);

    await request(app)
      .post(`/teams/current/join-requests/${otherUser.id}`)
      .set('Authorization', `Bearer ${fullToken}`)
      .expect(403, { error: Error.TeamFull });
  });

  it('should succeed to join a full team as a coach', async () => {
    const otherUser = await createFakeUser({ type: UserType.player });

    await teamOperations.askJoinTeam(fullTeam.id, otherUser.id, UserType.coach);

    await request(app)
      .post(`/teams/current/join-requests/${otherUser.id}`)
      .set('Authorization', `Bearer ${fullToken}`)
      .expect(200);

    const databaseUser = await fetchUser(otherUser.id);
    expect(databaseUser.teamId).to.be.equal(fullTeam.id);
  });

  it('should fail to join the team as a coach because there are already 2 coaches', async () => {
    // There is only one coach for the moment
    const coach = await createFakeUser();
    await teamOperations.joinTeam(fullTeam.id, coach, UserType.coach);
    const willNotJoinCoach = await createFakeUser();
    await teamOperations.askJoinTeam(fullTeam.id, willNotJoinCoach.id, UserType.coach);
    await request(app)
      .post(`/teams/current/join-requests/${willNotJoinCoach.id}`)
      .set('Authorization', `Bearer ${fullToken}`)
      .expect(403, { error: Error.TeamMaxCoachReached });

    const databaseCoach = await fetchUser(willNotJoinCoach.id);
    expect(databaseCoach.teamId).to.be.null;
  });

  it('should successfully join the 1-player team as a coach', async () => {
    const coach = await createFakeUser({ type: UserType.player });
    await teamOperations.askJoinTeam(onePlayerTeam.id, coach.id, UserType.coach);
    await request(app)
      .post(`/teams/current/join-requests/${coach.id}`)
      .set('Authorization', `Bearer ${onePlayerTeamToken}`)
      .expect(200);

    const databaseCoach = await fetchUser(coach.id);
    expect(databaseCoach.teamId).to.be.equal(onePlayerTeam.id);
  });

  it('should fail to join the 1-player team as a coach because there is already a coach', async () => {
    const coach = await createFakeUser({ type: UserType.player });
    await teamOperations.askJoinTeam(onePlayerTeam.id, coach.id, UserType.coach);
    await request(app)
      .post(`/teams/current/join-requests/${coach.id}`)
      .set('Authorization', `Bearer ${onePlayerTeamToken}`)
      .expect(403, { error: Error.TeamMaxCoachReached });

    const databaseCoach = await fetchUser(coach.id);
    expect(databaseCoach.teamId).to.be.null;
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

    const updatedUser = await userOperations.fetchUser(user.id);

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
    await cartOperations.updateCart(cart.id, {transactionState: 'pending'});

    await request(app)
      .post(`/teams/current/join-requests/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify the team has not been locked
    const databaseTeam = await teamOperations.fetchTeam(team.id);
    expect(databaseTeam.lockedAt).to.be.null;
    expect(databaseTeam.enteredQueueAt).to.be.null;

    // Make the user pay again
    await cartOperations.updateCart(cart.id, { transactionState: 'paid' });

    // Remove the user for the next test
    await teamOperations.kickUser(await userOperations.fetchUser(user2.id));
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
    await cartOperations.updateCart(cart.id, { transactionState: "pending" });

    await request(app)
      .post(`/teams/current/join-requests/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    // Make the user pay again
    await cartOperations.updateCart(cart.id, { transactionState: "paid" });

    // Remove the user for the next test
    await teamOperations.kickUser(await userOperations.fetchUser(user2.id));
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

    const updatedUser = await userOperations.fetchUser(user2.id);

    expect(body.players).to.have.lengthOf(team.players.length + 1);
    expect(updatedUser.askingTeamId).to.be.null;

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
    // Verify the team has been put into queue
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.not.null;

    // Remove the user for the next test
    await teamOperations.kickUser(await userOperations.fetchUser(user2.id));
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);
  });

  it('should successfully join the team and lock it', async () => {
    // Add an asking user
    await teamOperations.askJoinTeam(team.id, user3.id, UserType.player);

    // Add an asking coach
    await teamOperations.askJoinTeam(team.id, coach2.id, UserType.coach);

    // Verify the team is not locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;
    tournament = await tournamentOperations.fetchTournament(tournament.id);

    // Remove a team from the tournament
    const teamToRemove = tournament.teams.find((pTeam) => pTeam.lockedAt)!;
    await teamOperations.deleteTeam(teamToRemove);
    await teamOperations.deleteTeam(tournament.teams.find((pTeam) => pTeam.lockedAt && pTeam.id !== teamToRemove.id)!);

    await request(app)
      .post(`/teams/current/join-requests/${user2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify the team has been locked
    team = await teamOperations.fetchTeam(team.id);
    expect(team.lockedAt).to.be.not.null;
    expect(team.enteredQueueAt).to.be.null;

    // Check that the asking users have been removed
    const databaseUser = await userOperations.fetchUser(user3.id);
    expect(databaseUser.askingTeamId).to.be.null;

    const databaseCoach = await userOperations.fetchUser(coach2.id);
    expect(databaseCoach.askingTeamId).to.be.not.null;

    // Remove the users for the next test
    await teamOperations.kickUser(await userOperations.fetchUser(coach2.id));
    await teamOperations.kickUser(await userOperations.fetchUser(user2.id));
    await teamOperations.askJoinTeam(team.id, user2.id, UserType.player);
  });

  it('should fail because the user is already in a team', async () => {
    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.AlreadyInTeam });
  });

  it('should fail because the user has not asked for a team', async () => {
    await teamOperations.kickUser(await userOperations.fetchUser(user.id));
    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotAskedTeam });
  });
});
