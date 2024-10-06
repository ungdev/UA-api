import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import * as itemOperations from '../../src/operations/item';
import * as cartOperations from '../../src/operations/carts';
import database from '../../src/services/database';
import { Error, User, Team, UserAge, UserType, TransactionState } from '../../src/types';
import { createFakeUser, createFakeTeam, createFakeTournament } from '../utils';
import { generateToken } from '../../src/utils/users';
import { PayBody } from '../../src/controllers/users/createCart';
import { setShopAllowed } from '../../src/operations/settings';
import { getCaptain } from '../../src/utils/teams';
import { createAttendant, deleteUser, updateAdminUser } from '../../src/operations/user';
import { joinTeam } from '../../src/operations/team';
import { generateStripePaymentIntent, resetFakeStripeApi, stripePaymentIntents } from '../stripe';
import { fetchItem } from '../../src/operations/item';

describe('POST /users/current/carts', () => {
  let user: User;
  let token: string;

  let teamWithSwitchDiscount: Team;
  let userWithSwitchDiscount: User;
  let tokenWithSwitchDiscount: string;

  let notValidTeamWithSwitchDiscount: Team;
  let notValidUserWithSwitchDiscount: User;
  let notValidTokenWithSwitchDiscount: string;

  let annoyingTeamWithSwitchDiscount: Team;
  let annoyingUserWithSwitchDiscount: User;
  let annoyingTokenWithSwitchDiscount: string;

  let teamInFullTournament: Team;
  let captainInFullTournament: User;
  let tokenInFullTournament: string;
  let coachInFullTournament: User;

  const validCart: PayBody = {
    tickets: {
      userIds: [], // 2 players and a coach will be added
      attendant: { firstname: 'toto', lastname: 'de lachô' },
    },
    supplements: [
      {
        itemId: 'ethernet-7',
        quantity: 4,
      },
    ],
  };

  const validCartWithSwitchDiscount: PayBody = {
    tickets: {
      userIds: [],
    },
    supplements: [
      {
        itemId: 'discount-switch-ssbu',
        quantity: 1,
      },
    ],
  };

  const validCartWithSwitchDiscountWithoutTicket: PayBody = {
    tickets: {
      userIds: [],
    },
    supplements: [
      {
        itemId: 'ethernet-7',
        quantity: 4,
      },
      {
        itemId: 'discount-switch-ssbu',
        quantity: 1,
      },
    ],
  };

  const notValidCartWithSwitchDiscount: PayBody = {
    tickets: {
      userIds: [],
    },
    supplements: [
      {
        itemId: 'discount-switch-ssbu',
        quantity: 1,
      },
    ],
  };

  const annoyingCartWithSwitchDiscount: PayBody = {
    tickets: {
      userIds: [],
    },
    supplements: [
      {
        itemId: 'discount-switch-ssbu',
        quantity: 1,
      },
    ],
  };

  const cartWithMultipleSwitchDiscounts: PayBody = {
    tickets: {
      userIds: [],
    },
    supplements: [
      {
        itemId: 'ethernet-7',
        quantity: 4,
      },
      {
        itemId: 'discount-switch-ssbu',
        quantity: 2,
      },
    ],
  };

  before(async () => {
    const tournament = await createFakeTournament({ playersPerTeam: 2, maxTeams: 2, coachesPerTeam: 1 });
    await createFakeTournament({ id: 'ssbu' });
    const team = await createFakeTeam({ members: 1, tournament: tournament.id, name: 'dontcare' });
    user = getCaptain(team);
    token = generateToken(user);

    const coach = await createFakeUser({ type: UserType.coach });
    const partnerUser = await createFakeUser({ type: UserType.player, email: 'toto@utt.fr' });
    await joinTeam(team.id, coach, UserType.coach);
    await joinTeam(team.id, partnerUser, UserType.player);

    // Add three tickets
    validCart.tickets.userIds.push(user.id, coach.id, partnerUser.id);

    teamWithSwitchDiscount = await createFakeTeam({ tournament: 'ssbu' });
    userWithSwitchDiscount = getCaptain(teamWithSwitchDiscount);
    tokenWithSwitchDiscount = generateToken(userWithSwitchDiscount);
    validCartWithSwitchDiscount.tickets.userIds.push(userWithSwitchDiscount.id);

    notValidTeamWithSwitchDiscount = await createFakeTeam({ tournament: tournament.id });
    notValidUserWithSwitchDiscount = getCaptain(notValidTeamWithSwitchDiscount);
    notValidTokenWithSwitchDiscount = generateToken(notValidUserWithSwitchDiscount);
    notValidCartWithSwitchDiscount.tickets.userIds.push(notValidUserWithSwitchDiscount.id);

    annoyingTeamWithSwitchDiscount = await createFakeTeam({ tournament: 'ssbu' });
    annoyingUserWithSwitchDiscount = getCaptain(annoyingTeamWithSwitchDiscount);
    annoyingTokenWithSwitchDiscount = generateToken(annoyingUserWithSwitchDiscount);

    const fullTournament = await createFakeTournament({ coachesPerTeam: 1, maxTeams: 0 });
    teamInFullTournament = await createFakeTeam({ members: 1, tournament: fullTournament.id });
    captainInFullTournament = getCaptain(teamInFullTournament);
    tokenInFullTournament = generateToken(captainInFullTournament);
    coachInFullTournament = await createFakeUser({ type: UserType.coach });
    await joinTeam(teamInFullTournament.id, coachInFullTournament, UserType.coach);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
    resetFakeStripeApi();
  });

  it('should fail as the shop is deactivated', async () => {
    await setShopAllowed(false);

    await request(app)
      .post(`/users/current/carts`)
      .send(validCart)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.ShopNotAllowed });

    await setShopAllowed(true);
  });

  it('should fail because the user is not authenticated', async () => {
    await request(app).post(`/users/current/carts`).send(validCart).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the body is missing', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidCart });
  });

  describe('dynamic tests failures on body', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const badBodies: any[] = [
      { tickets: { userIds: [] } },

      { supplements: [] },
      { tickets: { userIds: [], supplements: [] } },
      { tickets: { supplements: [] } },
    ];

    for (const [index, body] of badBodies.entries()) {
      it(`should not accept this bad body (${index + 1}/${badBodies.length})`, async () => {
        await request(app)
          .post(`/users/current/carts`)
          .set('Authorization', `Bearer ${token}`)
          .send(body)
          .expect(400, { error: Error.InvalidCart });
      });
    }
  });

  it('should fail when buying attendant ticket from adult account', () =>
    request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCart)
      .expect(403, { error: Error.AttendantNotAllowed }));

  it('should fail because child account already has an attendant', async () => {
    user = await updateAdminUser(user, {
      age: UserAge.child,
    });
    user = userOperations.formatUser(await createAttendant(user.id, 'Jean-François', 'Poisson'));
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCart)
      .expect(403, { error: Error.AttendantAlreadyRegistered });
    return deleteUser(user.attendantId);
  });

  describe('test fail quantity (negative, null and float)', () => {
    for (const quantity of [-1, 0, 0.25]) {
      it(`should fail as the quantity ${quantity}`, async () => {
        await request(app)
          .post(`/users/current/carts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            tickets: { userIds: [] },
            supplements: [{ itemId: 'ethernet-7', quantity }],
          })
          .expect(400, { error: Error.InvalidCart });
      });
    }
  });

  it('should fail because the basket is empty', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [] },
        supplements: [],
      })
      .expect(400, { error: Error.EmptyBasket });
  });

  it('should fail because the user id is listed twice', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [user.id, user.id] },
        supplements: [],
      })
      .expect(400, { error: Error.InvalidCart });
  });

  it('should fail because a supplement is listed twice', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [] },
        supplements: [
          {
            itemId: 'ethernet-7',
            quantity: 4,
          },
          {
            itemId: 'ethernet-7',
            quantity: 1,
          },
        ],
      })
      .expect(400, { error: Error.InvalidCart });
  });

  it('should fail as the user does not exists', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: ['A1Z2E3'] },
        supplements: [],
      })
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail as the supplement does not exists', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [] },
        supplements: [{ itemId: 'randomItem', quantity: 1 }],
      })
      .expect(404, { error: Error.ItemNotFound });
  });

  it('should fail as the user is not a player or a coach or a spectator', async () => {
    const attendantUser = await createFakeUser({ type: UserType.attendant });

    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [attendantUser.id] },
        supplements: [],
      })
      .expect(403, { error: Error.NotPlayerOrCoachOrSpectator });
  });

  it('should fail as the user is already paid', async () => {
    const paidUser = await createFakeUser({ paid: true, type: UserType.player });

    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [paidUser.id] },
        supplements: [],
      })
      .expect(403, { error: Error.PlayerAlreadyPaid });

    // Delete the user to not make the results wrong for the success test
    await database.cartItem.deleteMany({ where: { forUserId: paidUser.id } });
    await database.cart.deleteMany({ where: { userId: paidUser.id } });
    await database.user.delete({ where: { id: paidUser.id } });
  });

  it('should fail as the user is not in the same team', async () => {
    const userInOtherTeam = await createFakeUser({ type: UserType.player });
    const tokenInOtherTeam = generateToken(userInOtherTeam);

    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${tokenInOtherTeam}`)
      .send({
        tickets: { userIds: [] },
        supplements: [],
      })
      .expect(403, { error: Error.NotInSameTeam });
  });

  it('should fail with an internal server error (inner try/catch)', () => {
    sandbox.stub(cartOperations, 'createCart').throws('Unexpected error');

    return request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [] },
        supplements: [
          {
            itemId: 'ethernet-7',
            quantity: 4,
          },
        ],
      } as PayBody)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail with an internal server error (outer try/catch)', () => {
    sandbox.stub(itemOperations, 'fetchAllItems').throws('Unexpected error');

    return request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCart)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should successfully create a cart', async () => {
    const oldUserCount = await database.user.count();
    const { body } = await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCart)
      .expect(201);

    const carts = await database.cart.findMany({
      where: {
        userId: user.id,
      },
    });

    const cart = carts[0];

    const cartItems = await database.cartItem.findMany({
      where: {
        cartId: cart.id,
      },
    });
    const supplement = cartItems.find((cartItem) => cartItem.itemId === validCart.supplements[0].itemId);

    const users = await database.user.findMany();

    const coach = users.find((findUser) => findUser.type === UserType.coach && findUser.teamId === user.teamId);
    const attendant = users.find((findUser) => findUser.type === UserType.attendant);

    expect(body.checkoutSecret).to.be.equal(stripePaymentIntents.at(-1).client_secret);

    expect(carts).to.have.lengthOf(1);
    expect(cartItems).to.have.lengthOf(5);
    expect(users).to.have.lengthOf(oldUserCount + 1);

    expect(cartItems.filter((cartItem) => cartItem.forUserId === user.id)).to.have.lengthOf(2);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === coach?.id)).to.have.lengthOf(1);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === attendant?.id)).to.have.lengthOf(1);

    expect(supplement?.quantity).to.be.equal(validCart.supplements[0].quantity);

    expect(attendant?.firstname).to.be.equal(validCart.tickets.attendant?.firstname);
    expect(attendant?.lastname).to.be.equal(validCart.tickets.attendant?.lastname);

    expect(stripePaymentIntents.at(-1).amount).to.be.equal(
      cartItems.reduce((previous, current) => (current.reducedPrice ?? current.price) * current.quantity + previous, 0),
    );
  });

  it('should successfuly create a cart even with the ssbu discount', async () => {
    const { body } = await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${tokenWithSwitchDiscount}`)
      .send(validCartWithSwitchDiscount)
      .expect(201);

    const carts = await database.cart.findMany({
      where: {
        userId: userWithSwitchDiscount.id,
      },
    });

    const cart = carts[0];

    const cartItems = await database.cartItem.findMany({
      where: {
        cartId: cart.id,
      },
    });
    const supplement = cartItems.find(
      (cartItem) => cartItem.itemId === validCartWithSwitchDiscount.supplements[0].itemId,
    );

    expect(body.checkoutSecret).to.be.equal(stripePaymentIntents.at(-1).client_secret);

    expect(carts).to.have.lengthOf(1);
    expect(cartItems).to.have.lengthOf(2);

    expect(cartItems.filter((cartItem) => cartItem.forUserId === userWithSwitchDiscount.id)).to.have.lengthOf(2);

    expect(supplement?.quantity).to.be.equal(validCartWithSwitchDiscount.supplements[0].quantity);

    expect(stripePaymentIntents.at(-1).amount).to.be.equal(
      cartItems.reduce((previous, current) => current.price * current.quantity + previous, 0),
    );
  });

  it('should error as spectator cannot rent a pc', async () => {
    const spectator = await createFakeUser({ type: UserType.spectator });
    const specToken = generateToken(spectator);

    return request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${specToken}`)
      .send({
        tickets: {
          userIds: [],
        },
        supplements: [
          {
            itemId: 'pc',
            quantity: 1,
          },
        ],
      })
      .expect(404, { error: Error.ItemNotFound });
  });

  it('should sucessfully create a cart with a rental pc', async () => {
    const userToken = generateToken(notValidUserWithSwitchDiscount);

    const { body } = await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        tickets: {
          userIds: [],
        },
        supplements: [
          {
            itemId: 'pc',
            quantity: 1,
          },
        ],
      })
      .expect(201);
    expect(body.checkoutSecret).to.be.equal(stripePaymentIntents.at(-1).client_secret);
    expect(stripePaymentIntents.at(-1).amount).to.be.equal((await fetchItem('pc')).price);
  });

  it('should send an error as ssbu discount is already in a pending cart', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${tokenWithSwitchDiscount}`)
      .send(validCartWithSwitchDiscountWithoutTicket)
      .expect(403, { error: Error.AlreadyHasPendingCartWithDiscountSSBU });
    const carts = await database.cart.findMany({
      where: {
        userId: userWithSwitchDiscount.id,
      },
    });
    // We verify no cart has been created
    expect(carts).to.have.lengthOf(1);
  });

  it('should send an error as ssbu discount is already in a paid cart', async () => {
    const cartWithDiscountId = (
      await database.cartItem.findFirstOrThrow({
        where: { forUserId: userWithSwitchDiscount.id, itemId: 'discount-switch-ssbu' },
      })
    ).cartId;
    await cartOperations.updateCart(cartWithDiscountId, {
      transactionId: '123',
      transactionState: TransactionState.paid,
    });
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${tokenWithSwitchDiscount}`)
      .send(validCartWithSwitchDiscountWithoutTicket)
      .expect(403, { error: Error.AlreadyAppliedDiscountSSBU });
    const carts = await database.cart.findMany({
      where: {
        userId: userWithSwitchDiscount.id,
      },
    });
    // We verify no cart has been created
    expect(carts).to.have.lengthOf(1);
  });

  it('should not create a cart as not in the ssbu team', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${notValidTokenWithSwitchDiscount}`)
      .send(notValidCartWithSwitchDiscount)
      .expect(404, { error: Error.ItemNotFound });
  });

  it('should not create a cart as basket price is negative', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${annoyingTokenWithSwitchDiscount}`)
      .send(annoyingCartWithSwitchDiscount)
      .expect(403, { error: Error.BasketCannotBeNegative });
  });

  it('should fail as user cannot order more than 1 ssbu reduction', async () => {
    await database.cartItem.deleteMany({
      where: { itemId: 'discount-switch-ssbu', forUserId: userWithSwitchDiscount.id },
    });
    await request(app)
      .post('/users/current/carts')
      .set('Authorization', `Bearer ${tokenWithSwitchDiscount}`)
      .send(cartWithMultipleSwitchDiscounts)
      .expect(403, { error: Error.OnlyOneDiscountSSBU });
  });

  it('should fail as the item is no longer available', async () => {
    const items = await itemOperations.fetchAllItems();
    const currentSpectatorStock = items.find((item) => item.id === 'ticket-spectator')?.stock;

    await database.item.update({
      data: { stock: 0 },
      where: { id: 'ticket-spectator' },
    });

    const spectator = await createFakeUser({ type: UserType.spectator });
    const spectatorToken = generateToken(spectator);

    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${spectatorToken}`)
      .send({
        tickets: { userIds: [spectator.id] },
        supplements: [],
      })
      .expect(410, { error: Error.ItemOutOfStock });

    return database.item.update({
      data: { stock: currentSpectatorStock },
      where: { id: 'ticket-spectator' },
    });
  });

  it('should succeed to buy last item', async () => {
    // We clear previous tickets first
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();

    const items = await itemOperations.fetchAllItems();
    const currentSpectatorStock = items.find((item) => item.id === 'ticket-spectator')?.stock;

    await database.item.update({
      data: { stock: 1 },
      where: { id: 'ticket-spectator' },
    });

    const spectator = await createFakeUser({ type: UserType.spectator });
    const spectatorToken = generateToken(spectator);

    const { body } = await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${spectatorToken}`)
      .send({
        tickets: { userIds: [spectator.id] },
        supplements: [],
      })
      .expect(201);

    expect(body.checkoutSecret).to.be.equal(stripePaymentIntents.at(-1).client_secret);
    expect(stripePaymentIntents.at(-1).amount).to.be.equal((await fetchItem('ticket-spectator')).price);

    return database.item.update({
      data: { stock: currentSpectatorStock },
      where: { id: 'ticket-spectator' },
    });
  });

  it('should pass as an expired stock-blocking cart was deleted', async () => {
    // We clear previous tickets first
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();

    // We retrieve ticket-spectator stock to reset it at the end of the test
    const items = await itemOperations.fetchAllItems();
    const spectatorTicket = items.find((item) => item.id === 'ticket-spectator')!;

    // We set stock for the ticket to 1 unit
    await database.item.update({
      data: { stock: 1 },
      where: { id: 'ticket-spectator' },
    });

    // We use that unit for a spectator and force-expire his cart
    const expiredSpectator = await createFakeUser({ type: UserType.spectator });
    const expiredSpectatorCart = await cartOperations.forcePay(expiredSpectator);
    const paymentIntent = generateStripePaymentIntent(spectatorTicket.price);
    await database.cart.update({
      where: {
        id: expiredSpectatorCart.id,
      },
      data: {
        createdAt: new Date(Date.now() - 6e6),
        updatedAt: new Date(Date.now() - 6e6),
        transactionState: 'pending',
        transactionId: paymentIntent.id,
        cartItems: {
          updateMany: {
            data: {
              createdAt: new Date(Date.now() - 6e6),
              updatedAt: new Date(Date.now() - 6e6),
            },
            where: {},
          },
        },
      },
    });

    // We create another spectator who will try to buy a spectator ticket
    // This operation should succeed.
    const spectator = await createFakeUser({ type: UserType.spectator });
    const spectatorToken = generateToken(spectator);

    const { body } = await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${spectatorToken}`)
      .send({
        tickets: { userIds: [spectator.id] },
        supplements: [],
      })
      .expect(201);

    expect(body.checkoutSecret).to.be.equal(stripePaymentIntents.at(-1).client_secret);

    // Check that the expired cart has been deleted
    const expiredSpectatorCarts = await cartOperations.fetchCarts(expiredSpectator.id);
    expect(expiredSpectatorCarts).to.have.lengthOf(1);
    expect(expiredSpectatorCarts[0].transactionState).to.be.equal(TransactionState.expired);

    const spectatorTickets = await database.cartItem.findMany({
      where: {
        itemId: 'ticket-spectator',
      },
    });
    expect(spectatorTickets).to.have.lengthOf(2);

    expect(stripePaymentIntents.at(-1).amount).to.be.equal(spectatorTicket.price);
    expect(stripePaymentIntents.some((pi) => pi.id === paymentIntent.id)).to.be.false;

    // Restore actual stock
    return database.item.update({
      data: { stock: spectatorTicket.stock },
      where: { id: 'ticket-spectator' },
    });
  });

  it('should fail as a player is trying to pay his place in a full tournament', async () => {
    await request(app)
      .post('/users/current/carts')
      .set('Authorization', `Bearer ${tokenInFullTournament}`)
      .send({
        tickets: { userIds: [captainInFullTournament.id] },
        supplements: [],
      })
      .expect(403, { error: Error.TournamentFull });
  });

  it('should fail as we are trying to buy the place of a coach in an unlocked team in a full tournament', async () => {
    await request(app)
      .post('/users/current/carts')
      .set('Authorization', `Bearer ${tokenInFullTournament}`)
      .send({
        tickets: { userIds: [coachInFullTournament.id] },
        supplements: [],
      })
      .expect(403, { error: Error.TournamentFull });
  });
});
