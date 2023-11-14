import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Cart, Error, Permission, User, TransactionState, Team, UserType } from "../../../src/types";
import * as cartOperations from '../../../src/operations/carts';
import * as teamOperations from '../../../src/operations/team';
import * as tournamentOperations from '../../../src/operations/tournament';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';

describe('POST /admin/carts/:cartId/refund', () => {
  let user: User;
  let admin: User;
  let adminToken: string;
  let playerCart: Cart;
  let coachCart: Cart;
  let waitingTeam: Team;

  before(async () => {
    const tournament = await tournamentOperations.fetchTournament('lol');
    user = await createFakeUser({type: UserType.player});
    const coach = await createFakeUser({type: UserType.player});
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);
    const team = await createFakeTeam({
      members: tournament.playersPerTeam - 1,
      paid: true,
      locked: true,
      tournament: 'lol',
    });
    await teamOperations.joinTeam(team.id, user, 'player');
    await teamOperations.joinTeam(team.id, coach, 'coach');

    // Fill the tournament
    for (let index = 0; index < tournament.placesLeft - 1; index++) {
      await createFakeTeam({ members: tournament.playersPerTeam, paid: true, locked: true, tournament: 'lol' });
    }
    waitingTeam = await createFakeTeam({ members: tournament.playersPerTeam, paid: true, tournament: 'lol' });
    await teamOperations.lockTeam(waitingTeam.id);

    // Refresh the user
    user = await userOperations.fetchUser(user.id);

    playerCart = await cartOperations.createCart(user.id, [
      { itemId: 'ticket-player', price: 2000, quantity: 1, forUserId: user.id },
    ]);
    coachCart = await cartOperations.createCart(user.id, [
      { itemId: 'ticket-coach', price: 1500, quantity: 1, forUserId: coach.id },
    ]);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/carts/${playerCart.id}/refund`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .post(`/admin/carts/${playerCart.id}/refund`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the cart is not found', () =>
    request(app)
      .post('/admin/carts/A12B3C/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.CartNotFound }));

  it('should error because the cart is not yet payed', () =>
    request(app)
      .post(`/admin/carts/${playerCart.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.NotPaid }));

  it('should throw an internal server error', async () => {
    await database.cart.update({
      data: { transactionState: TransactionState.paid },
      where: { id: playerCart.id },
    });
    // Fake the main function to throw
    sandbox.stub(cartOperations, 'refundCart').throws('Unexpected error');

    // Request to login
    await request(app)
      .post(`/admin/carts/${playerCart.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should refund the cart, but not unlock the team as the user was a coach', async () => {
    // Verify the team is locked (it should be, but that's for safety)
    let team = await teamOperations.fetchTeam(user.teamId);
    expect(team.lockedAt).to.be.not.null;
    expect(team.enteredQueueAt).to.be.null;

    // Pay the tickets
    await database.cart.update({
      data: { transactionState: TransactionState.paid },
      where: { id: coachCart.id },
    });

    await request(app)
      .post(`/admin/carts/${coachCart.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    // Verify the team has been unlocked
    team = await teamOperations.fetchTeam(user.teamId);
    expect(team.lockedAt).to.be.not.null;
    expect(team.enteredQueueAt).to.be.null;

    // Verify the waiting team has not been unlocked
    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.null;
    expect(waitingTeam.enteredQueueAt).to.be.not.null;
  });

  it('should refund the cart, unlock the team, and make the waiting team locked', async () => {
    await database.cart.update({
      data: { transactionState: TransactionState.paid },
      where: { id: playerCart.id },
    });

    await request(app)
      .post(`/admin/carts/${playerCart.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    // Verify the team has been unlocked
    const team = await teamOperations.fetchTeam(user.teamId);
    expect(team.lockedAt).to.be.null;
    expect(team.enteredQueueAt).to.be.null;

    // Verify the waiting team has been locked
    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.not.null;
    expect(waitingTeam.enteredQueueAt).to.be.null;
  });
});
