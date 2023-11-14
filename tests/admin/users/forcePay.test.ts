import { expect } from 'chai';
import request from 'supertest';
import { UserType } from '@prisma/client';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, Team, Tournament, User } from '../../../src/types';
import * as cartOperations from '../../../src/operations/carts';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import * as teamOperations from '../../../src/operations/team';
import * as userOperations from '../../../src/operations/user';
import * as tournamentOperations from '../../../src/operations/tournament';

describe('POST /admin/users/:userId/force-pay', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

  let team: Team;
  let tournament: Tournament;
  let player1: User;
  let player2: User;

  before(async () => {
    user = await createFakeUser({type: UserType.player});
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);
    // Store the promises, to wait them all at the same time
    const promises = [];

    tournament = await tournamentOperations.fetchTournament('lol');
    team = await createFakeTeam({ members: tournament.playersPerTeam, tournament: 'lol' });
    // Fill the tournament
    for (let index = 0; index < tournament.placesLeft; index++) {
      promises.push(createFakeTeam({ members: tournament.playersPerTeam, tournament: 'lol', locked: true }));
    }
    // Fetch the first 2 players, and force pay the others
    [player1, player2] = team.players;
    for (const player of team.players.slice(2)) await cartOperations.forcePay(player);

    // Await all the operations
    await Promise.all(promises);

    // Refresh the tournament
    tournament = await tournamentOperations.fetchTournament('lol');
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/users/${user.id}/force-pay`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not found', () =>
    request(app)
      .post('/admin/users/A12B3C/force-pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound }));

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(cartOperations, 'forcePay').throws('Unexpected error');

    // Request to login
    await request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should force pay the user', async () => {
    const { body } = await request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.hasPaid).to.be.true;
  });

  it('should fail as the user has already been force payed', () =>
    request(app)
      .post(`/admin/users/${user.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.AlreadyPaid }));

  it('should force pay the user and scan his ticket at the same time', async () => {
    const otherUser = await createFakeUser({type: UserType.player});
    const { body } = await request(app)
      .post(`/admin/users/${otherUser.id}/force-pay`)
      .send({
        consume: true,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.hasPaid).to.be.true;
    expect(body.scannedAt).not.to.be.null;
  });

  it("should add a ticket to player and not lock the team because everyone hasn't payed", async () => {
    const { body } = await request(app)
      .post(`/admin/users/${player1.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(body.hasPaid).to.be.true;
    const lolTeamFromDatabase = await database.team.findUnique({ where: { id: team.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;
  });

  it('should response api ok, and place the team in the queue', async () => {
    await request(app)
      .post(`/admin/users/${player2.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const lolTeamFromDatabase = await database.team.findUnique({ where: { id: team.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.not.be.null;
    // Cancel the payment
    await database.cart.deleteMany({ where: { userId: player2.id } });
    await teamOperations.unlockTeam(team.id);
  });

  it('should response api ok, and not lock the team because the team is not full', async () => {
    // Remove a player from the team
    const removedUser = await teamOperations.kickUser(
      team.players.find((player: User) => player.id !== team.captainId && player.id !== player2.id),
    );

    // This will be called twice, in two different circumstances
    const makeTest = async () => {
      await request(app)
        .post(`/admin/users/${player2.id}/force-pay`)
        .set('Authorization', `Bearer: ${adminToken}`)
        .expect(200);
      const lolTeamFromDatabase = await database.team.findUnique({ where: { id: team.id } });
      expect(lolTeamFromDatabase.lockedAt).to.be.null;
      expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;
      // Make the cart not paid
      await database.cart.deleteMany({ where: { userId: player2.id } });
    };

    // Test with the tournament not full
    // Remove a team from the tournament
    const unlockedTeam = await teamOperations.unlockTeam(
      tournament.teams.find((pTeam: Team) => pTeam.id !== team.id).id,
    );
    await makeTest();
    // Lock back the team
    await teamOperations.lockTeam(unlockedTeam.id);
    // Test with the tournament full
    await makeTest();

    // Add back the player
    // We need to re-fetch the user because we don't have enough data returned from the kickUser function
    await teamOperations.joinTeam(team.id, await userOperations.fetchUser(removedUser.id), UserType.player);
  });

  it('should response api ok, and lock the team', async () => {
    // Verify the team is not already locked
    let lolTeamFromDatabase = await database.team.findUnique({ where: { id: team.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;

    // Remove a team from the tournament
    const unlockedTeam = await teamOperations.unlockTeam(
      tournament.teams.find((pTeam: Team) => pTeam.id !== team.id).id,
    );
    await request(app)
      .post(`/admin/users/${player2.id}/force-pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    lolTeamFromDatabase = await database.team.findUnique({ where: { id: team.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.not.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;
    // Unlock the team and lock back the removed team
    await teamOperations.unlockTeam(team.id);
    await teamOperations.lockTeam(unlockedTeam.id);
  });
});
