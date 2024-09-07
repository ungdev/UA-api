import { expect } from 'chai';
import request from 'supertest';
import { UserType } from '@prisma/client';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as cartItemOperations from '../../src/operations/cartItem';
import database from '../../src/services/database';
import { CartItem, Error, User, TransactionState, Team } from '../../src/types';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { createCart, fetchCarts, updateCart } from '../../src/operations/carts';
import { fetchAllItems } from '../../src/operations/item';
import { fetchUser } from '../../src/operations/user';

describe('POST /users/:userId/carts', () => {
  let user: User;
  let token: string;
  let team: Team;
  let ticket: CartItem;
  let supplement: CartItem;

  before(async () => {
    const tournament = await createFakeTournament();
    team = await createFakeTeam({ members: 1, tournament: tournament.id, locked: true });
    user = await fetchUser(team.captainId);
    token = generateToken(user);

    // Create a ticket and a supplement
    await createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-player')!.price,
        forUserId: user.id,
      },
      {
        itemId: 'ethernet-7',
        price: (await fetchAllItems()).find((item) => item.id === 'ethernet-7')!.price,
        quantity: 1,
        forUserId: user.id,
      },
    ]);

    // Retreive the ticket and the supplement
    const carts = await fetchCarts(user.id);
    const [cart] = carts;

    ticket = cart.cartItems.find((cartItem) => cartItem.itemId === 'ticket-player')!;
    supplement = cart.cartItems.find((cartItem) => cartItem.itemId === 'ethernet-7')!;
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.orga.deleteMany();
    await database.team.deleteMany();
    await database.tournament.deleteMany();
    await database.user.deleteMany();
  });

  it("should fail because cart item doesn't belong to the user", async () => {
    const otherUser = await createFakeUser({ type: UserType.player });
    const otherToken = generateToken(otherUser);

    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403, { error: Error.NotSelf });
  });

  it("should fail because the cartItem doesn't exists", async () => {
    await request(app)
      .get(`/tickets/A1B2C3`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TicketNotFound });
  });

  it('should fail because the cartItem is not in the ticket category', async () => {
    await request(app)
      .get(`/tickets/${supplement.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TicketNotFound });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(cartItemOperations, 'fetchCartItem').throws('Unexpected error');

    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail because the cart associated to the ticket is not paid', async () => {
    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotPaid });
  });

  it('shoud successfully get the pdf of current user', async () => {
    // Pay the cart
    await updateCart(ticket.cartId, 123, TransactionState.paid);

    const { body } = await request(app)
      .get(`/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .expect('Content-Type', 'application/pdf')
      .expect(200);

    return expect(Buffer.isBuffer(body)).to.be.true;
  });

  it('shoud successfully get the pdf', async () => {
    const { body } = await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect('Content-Type', 'application/pdf')
      .expect(200);

    return expect(Buffer.isBuffer(body)).to.be.true;
  });

  it('should fail as the player team is not locked', async () => {
    await database.team.update({ where: { id: user.teamId! }, data: { lockedAt: null } });

    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.TeamNotLocked });
  });

  it('should fail to get the pdf as the player team no longer exists', async () => {
    await database.team.deleteMany();

    await request(app)
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotInTeam });
  });
});
