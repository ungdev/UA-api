import request from 'supertest';
import { UserType } from '@prisma/client';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import * as itemOperations from '../../src/operations/item';
import database from '../../src/services/database';
import { Error, User, Team, Item } from '../../src/types';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { fetchUserItems } from '../../src/operations/item';
import { filterItem } from '../../src/utils/filters';
import { forcePay } from '../../src/operations/carts';

describe('GET /users/:userId/ticket', () => {
  let token: string;
  let team: Team;
  let user: User;
  let remotePlayer: User;

  before(async () => {
    const tournament = await createFakeTournament();
    team = await createFakeTeam({ members: 2, tournament: tournament.id });
    [user, remotePlayer] = team.players;
    token = generateToken(user);
  });

  after(async () => {
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  it('should fail because the user is not authenticated', async () => {
    await request(app).get(`/users/${remotePlayer.id}/ticket`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is not in a team', async () => {
    const otherUser = await createFakeUser({ type: UserType.player });
    const otherToken = generateToken(otherUser);

    await request(app)
      .get(`/users/${remotePlayer.id}/ticket`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail because the user is not in the same team', async () => {
    const outerUser = await createFakeUser({ type: UserType.player });

    await request(app)
      .get(`/users/${outerUser.id}/ticket`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(itemOperations, 'fetchUserItems').throws('Unexpected error');

    await request(app)
      .get(`/users/${remotePlayer.id}/ticket`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return the ticket of the remote player', async () => {
    const item = filterItem((await fetchUserItems()).find((ticket) => ticket.id === 'ticket-player') as Item);
    delete item.left; // because ticket-player has no stock and `left` will cause issues otherwise
    await request(app)
      .get(`/users/${remotePlayer.id}/ticket`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200, item);
  });

  it('should return the ticket of the remote coach', async () => {
    await userOperations.updateAdminUser(remotePlayer, {
      type: 'coach',
    });
    const item = filterItem((await fetchUserItems()).find((ticket) => ticket.id === 'ticket-coach') as Item);
    delete item.left; // because ticket-player has no stock and `left` will cause issues otherwise
    await request(app)
      .get(`/users/${remotePlayer.id}/ticket`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200, item)
      .then(async (result) => {
        await userOperations.updateAdminUser(remotePlayer, {
          type: 'player',
        });
        return result;
      });
  });

  it('should fail as target has already paid', async () => {
    await forcePay(remotePlayer);
    await request(app)
      .get(`/users/${remotePlayer.id}/ticket`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.AlreadyPaid });
  });
});
