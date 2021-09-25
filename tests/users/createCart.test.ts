import { UserAge, UserType } from '@prisma/client';
import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import * as itemOperations from '../../src/operations/item';
import database from '../../src/services/database';
import { Error, User, Team } from '../../src/types';
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

  // TESTS : Remove visitors property (update to attendant)
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
    const spectator = await createFakeUser({ type: UserType.spectator });

    // Add three tickets
    validCart.tickets.userIds.push(user.id, coach.id, partnerUser.id, spectator.id);

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
    await database.log.deleteMany();
    await database.cartItem.deleteMany();
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
      .expect(400, { error: Error.InvalidBody });
  });

  describe('dynamic tests failures on body', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const badBodies: any[] = [
      { tickets: { userIds: [], attendant: {} } },
      { supplements: [] },
      { tickets: { userIds: [], supplements: [] } },
      { tickets: { attendant: {}, supplements: [] } },
    ];

    for (const [index, badBody] of badBodies.entries()) {
      it(`should not accept this bad body (${index + 1}/${badBodies.length})`, async () => {
        await request(app)
          .post(`/users/current/carts`)
          .set('Authorization', `Bearer ${token}`)
          .send(badBody)
          .expect(400, { error: Error.InvalidBody });
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
          .expect(400, { error: Error.InvalidBody });
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
      .expect(400, { error: Error.InvalidBody });
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
      .expect(400, { error: Error.InvalidBody });
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
      .expect(403, { error: Error.NotPlayerOrCoachOrSpectator });

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
    sandbox.stub(userOperations, 'createAttendant').throws('Unexpected error');

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
    const spectator = users.find((findUser) => findUser.type === UserType.spectator);

    expect(body.url).to.startWith(env.etupay.url);

    // player place + player reduced price + coach place + attendant place + spectator place + 4 * ethernet-7
    expect(body.price).to.be.equal(2000 + 1500 + 1200 + 1200 + 1200 + 4 * 1000);

    expect(carts).to.have.lengthOf(1);
    expect(cartItems).to.have.lengthOf(6);
    expect(users).to.have.lengthOf(8);

    expect(cartItems.filter((cartItem) => cartItem.forUserId === user.id)).to.have.lengthOf(2);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === coach.id)).to.have.lengthOf(1);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === attendant.id)).to.have.lengthOf(1);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === spectator.id)).to.have.lengthOf(1);

    expect(supplement.quantity).to.be.equal(validCart.supplements[0].quantity);

    expect(attendant.firstname).to.be.equal(validCart.tickets.attendant.firstname);
    expect(attendant.lastname).to.be.equal(validCart.tickets.attendant.lastname);
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
    expect(body.price).to.be.equal(1500 - 300);

    expect(carts).to.have.lengthOf(1);
    expect(cartItems).to.have.lengthOf(2);

    expect(cartItems.filter((cartItem) => cartItem.forUserId === userWithSwitchDiscount.id)).to.have.lengthOf(2);

    expect(supplement.quantity).to.be.equal(validCartWithSwitchDiscount.supplements[0].quantity);
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
    const currentSpectatorStock = items.find((item) => item.id === 'ticket-spectator').stock;

    await database.item.update({
      data: { stock: 1 },
      where: { id: 'ticket-spectator' },
    });

    const spectator = await createFakeUser({ type: UserType.spectator });

    await request(app)
      .post(`/users/current/carts`)
      .set('Authorization', `Bearer ${token}`)
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
});
