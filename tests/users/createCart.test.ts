import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import * as itemOperations from '../../src/operations/item';
import * as cartOperations from '../../src/operations/carts';
import database from '../../src/services/database';
import { Error, User, Team, UserAge, UserType } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';
import { PayBody } from '../../src/controllers/users/createCart';
import env from '../../src/utils/env';
import { setShopAllowed } from '../../src/operations/settings';
import { getCaptain } from '../../src/utils/teams';
import { createAttendant, deleteUser, updateAdminUser } from '../../src/operations/user';

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

  const validCart: PayBody = {
    tickets: {
      userIds: [],
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

  before(async () => {
    user = await createFakeUser();
    token = generateToken(user);

    const coach = await createFakeUser({ type: UserType.coach });
    const partnerUser = await createFakeUser({ email: 'toto@utt.fr' });

    // Add three tickets
    validCart.tickets.userIds.push(user.id, coach.id, partnerUser.id);

    teamWithSwitchDiscount = await createFakeTeam({ tournament: 'ssbu' });
    userWithSwitchDiscount = getCaptain(teamWithSwitchDiscount);
    tokenWithSwitchDiscount = generateToken(userWithSwitchDiscount);
    validCartWithSwitchDiscount.tickets.userIds.push(userWithSwitchDiscount.id);

    notValidTeamWithSwitchDiscount = await createFakeTeam({ tournament: 'lolCompetitive' });
    notValidUserWithSwitchDiscount = getCaptain(notValidTeamWithSwitchDiscount);
    notValidTokenWithSwitchDiscount = generateToken(notValidUserWithSwitchDiscount);
    notValidCartWithSwitchDiscount.tickets.userIds.push(notValidUserWithSwitchDiscount.id);

    annoyingTeamWithSwitchDiscount = await createFakeTeam({ tournament: 'ssbu' });
    annoyingUserWithSwitchDiscount = getCaptain(annoyingTeamWithSwitchDiscount);
    annoyingTokenWithSwitchDiscount = generateToken(annoyingUserWithSwitchDiscount);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
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
    user = await updateAdminUser(user.id, {
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

  it('should fail as you try to order a ticket for an orga', async () => {
    const orga = await createFakeUser({ type: UserType.orga });
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [orga.id] },
        supplements: [],
      })
      .expect(403, { error: Error.NotplayerOrCoach });

    // Delete the user to not make the results wrong for the success test
    await database.user.delete({ where: { id: orga.id } });
  });

  it('should fail as the user is already paid', async () => {
    const paidUser = await createFakeUser({ paid: true });

    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [paidUser.id] },
        supplements: [],
      })
      .expect(403, { error: Error.AlreadyPaid });

    // Delete the user to not make the results wrong for the success test
    await database.cartItem.deleteMany({ where: { forUserId: paidUser.id } });
    await database.cart.deleteMany({ where: { userId: paidUser.id } });
    await database.user.delete({ where: { id: paidUser.id } });
  });

  it('should fail with an internal server error (inner try/catch)', () => {
    sandbox.stub(cartOperations, 'createCart').throws('Unexpected error');

    return request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCart)
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

  it('should successfuly create a cart', async () => {
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

    const coach = users.find((findUser) => findUser.type === UserType.coach);
    const attendant = users.find((findUser) => findUser.type === UserType.attendant);

    expect(body.url).to.startWith(env.etupay.url);

    // player place + player reduced price + coach place + attendant place + 4 * ethernet-7
    expect(body.price).to.be.equal(2000 + 1500 + 1200 + 1200 + 4 * 1000);

    expect(carts).to.have.lengthOf(1);
    expect(cartItems).to.have.lengthOf(5);
    expect(users).to.have.lengthOf(8);

    expect(cartItems.filter((cartItem) => cartItem.forUserId === user.id)).to.have.lengthOf(2);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === coach?.id)).to.have.lengthOf(1);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === attendant?.id)).to.have.lengthOf(1);

    expect(supplement?.quantity).to.be.equal(validCart.supplements[0].quantity);

    expect(attendant?.firstname).to.be.equal(validCart.tickets.attendant?.firstname);
    expect(attendant?.lastname).to.be.equal(validCart.tickets.attendant?.lastname);
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

    expect(body.url).to.startWith(env.etupay.url);

    // player place - 1 * discount-ssbu
    expect(body.price).to.be.equal(2000 - 300);

    expect(carts).to.have.lengthOf(1);
    expect(cartItems).to.have.lengthOf(2);

    expect(cartItems.filter((cartItem) => cartItem.forUserId === userWithSwitchDiscount.id)).to.have.lengthOf(2);

    expect(supplement?.quantity).to.be.equal(validCartWithSwitchDiscount.supplements[0].quantity);
  });

  it('should send an error as ssbu discount is already applied', async () => {
    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${tokenWithSwitchDiscount}`)
      .send(validCartWithSwitchDiscountWithoutTicket)
      .expect(403, { error: Error.AlreadyAppliedDiscountSSBU });
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

  it('should fail as the item is no longer available', async () => {
    const items = await itemOperations.fetchAllItems();
    const currentAttendantStock = items.find((item) => item.id === 'ticket-attendant')?.stock;

    await database.item.update({
      data: { stock: 1 },
      where: { id: 'ticket-attendant' },
    });

    const attendant = await createFakeUser({ type: UserType.attendant });

    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [attendant.id] },
        supplements: [],
      })
      .expect(410, { error: Error.ItemOutOfStock });

    return database.item.update({
      data: { stock: currentAttendantStock },
      where: { id: 'ticket-attendant' },
    });
  });

  it('should succeed to buy last item', async () => {
    // We clear previous tickets first
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();

    const items = await itemOperations.fetchAllItems();
    const currentAttendantStock = items.find((item) => item.id === 'ticket-attendant')?.stock;

    await database.item.update({
      data: { stock: 1 },
      where: { id: 'ticket-attendant' },
    });

    const attendant = await createFakeUser({ type: UserType.attendant });

    const { body } = await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [attendant.id] },
        supplements: [],
      })
      .expect(201);

    expect(body.url).to.startWith(env.etupay.url);
    expect(body.price).to.be.equal(1200);

    return database.item.update({
      data: { stock: currentAttendantStock },
      where: { id: 'ticket-attendant' },
    });
  });

  it('should pass as a stale stock-blocking cart was deleted', async () => {
    // We clear previous tickets first
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();

    // We retrieve ticket-attendant stock to reset it at the end of the test
    const items = await itemOperations.fetchAllItems();
    const currentAttendantStock = items.find((item) => item.id === 'ticket-attendant')?.stock;

    // We set stock for the ticket to 1 unit
    await database.item.update({
      data: { stock: 1 },
      where: { id: 'ticket-attendant' },
    });

    // We use that unit for a attendant and force-stale his cart
    const staleAttendant = await createFakeUser({ type: UserType.attendant });
    const staleAttendantCart = await cartOperations.forcePay(staleAttendant);
    await database.cart.update({
      where: {
        id: staleAttendantCart.id,
      },
      data: {
        createdAt: new Date(Date.now() - 6e6),
        updatedAt: new Date(Date.now() - 6e6),
        transactionState: 'pending',
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

    // We create another attendant who will try to buy a attendant ticket
    // This operation should succeed.
    const attendant = await createFakeUser({ type: UserType.attendant });

    const { body } = await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [attendant.id] },
        supplements: [],
      })
      .expect(201);

    expect(body.url).to.startWith(env.etupay.url);
    expect(body.price).to.be.equal(1200);

    // Check that the stale cart has been deleted
    const staleAttendantCarts = await cartOperations.fetchCarts(staleAttendant.id);
    expect(staleAttendantCarts).to.have.lengthOf(0);

    const attendantTickets = await database.cartItem.findMany({
      where: {
        itemId: 'ticket-attendant',
      },
    });
    expect(attendantTickets).to.have.lengthOf(1);
    expect(attendantTickets[0].forUserId).to.be.equal(attendant.id);

    // Restore actual stock
    return database.item.update({
      data: { stock: currentAttendantStock },
      where: { id: 'ticket-attendant' },
    });
  });
});
