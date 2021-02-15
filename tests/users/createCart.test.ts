import { UserType } from '@prisma/client';
import request from 'supertest';
import faker from 'faker';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as cartOperations from '../../src/operations/carts';
import * as itemOperations from '../../src/operations/item';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/user';
import { PayBody } from '../../src/controllers/users/createCart';
import env from '../../src/utils/env';
import { setShopAllowed } from '../../src/operations/settings';

describe('POST /users/:userId/carts', () => {
  let user: User;
  let token: string;

  const validCart: PayBody = {
    tickets: {
      userIds: [],
      visitors: [{ firstname: 'toto', lastname: 'de lachô' }],
    },
    supplements: [
      {
        itemId: 'ethernet-7',
        quantity: 4,
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
  });

  after(async () => {
    // Delete the user created
    await database.log.deleteMany();
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail as the shop is deactivated', async () => {
    await setShopAllowed(false);

    await request(app)
      .post(`/users/${user.id}/carts`)
      .send(validCart)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.ShopNotAllowed });

    await setShopAllowed(true);
  });

  it('should fail because the user is not itself', async () => {
    const otherUser = await createFakeUser();
    const otherToken = generateToken(otherUser);

    await request(app)
      .post(`/users/${user.id}/carts`)
      .send(validCart)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403, { error: Error.NotSelf });

    // Delete the user to not make the results wrong for the success test
    await database.user.delete({ where: { id: otherUser.id } });
  });

  it('should fail because the body is missing', async () => {
    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidBody });
  });

  describe('dynamic tests failures on body', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const badBodies: any[] = [
      { tickets: { userIds: [], visitors: [] } },
      { supplements: [] },
      { tickets: { userIds: [], supplements: [] } },
      { tickets: { visitors: [], supplements: [] } },
    ];

    for (const [index, badBody] of badBodies.entries()) {
      it(`should not accept this bad body (${index + 1}/${badBodies.length})`, async () => {
        await request(app)
          .post(`/users/${user.id}/carts`)
          .set('Authorization', `Bearer ${token}`)
          .send(badBody)
          .expect(400, { error: Error.InvalidBody });
      });
    }
  });

  describe('test fail quantity (negative, null and float)', () => {
    for (const quantity of [-1, 0, 0.25]) {
      it(`should fail as the quantity ${quantity}`, async () => {
        await request(app)
          .post(`/users/${user.id}/carts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            tickets: { userIds: [], visitors: [] },
            supplements: [{ itemId: 'ethernet-7', quantity }],
          })
          .expect(400, { error: Error.InvalidBody });
      });
    }
  });

  it('should fail because the basket is empty', async () => {
    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [], visitors: [] },
        supplements: [],
      })
      .expect(400, { error: Error.EmptyBasket });
  });

  it('should fail because the user id is listed twice', async () => {
    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [user.id, user.id], visitors: [] },
        supplements: [],
      })
      .expect(400, { error: Error.InvalidBody });
  });

  it('should fail because a supplement is listed twice', async () => {
    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [], visitors: [] },
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
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: ['A1Z2E3'], visitors: [] },
        supplements: [],
      })
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail as the supplement does not exists', async () => {
    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [], visitors: [] },
        supplements: [{ itemId: 'randomItem', quantity: 1 }],
      })
      .expect(404, { error: Error.ItemNotFound });
  });

  it('should fail as you try to order a ticket for an orga', async () => {
    const orga = await createFakeUser({ type: UserType.orga });
    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [orga.id], visitors: [] },
        supplements: [],
      })
      .expect(403, { error: Error.NotPlayerOrCoach });

    // Delete the user to not make the results wrong for the success test
    await database.user.delete({ where: { id: orga.id } });
  });

  it('should fail as the user is already paid', async () => {
    const paidUser = await createFakeUser({ paid: true });

    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [paidUser.id], visitors: [] },
        supplements: [],
      })
      .expect(403, { error: Error.AlreadyPaid });

    // Delete the user to not make the results wrong for the success test
    await database.cartItem.deleteMany({ where: { forUserId: paidUser.id } });
    await database.cart.deleteMany({ where: { userId: paidUser.id } });
    await database.user.delete({ where: { id: paidUser.id } });
  });

  it('should fail as the item is no longer available', async () => {
    const visitors: { firstname: string; lastname: string }[] = [];

    for (let index = 0; index < 3; index += 1) {
      visitors.push({ firstname: faker.name.firstName(), lastname: faker.name.lastName() });
    }

    const items = await itemOperations.fetchItems();
    const currentVisitorStock = items.find((item) => item.id === 'ticket-visitor').stock;

    await database.item.update({
      data: { stock: 2 },
      where: { id: 'ticket-visitor' },
    });

    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        tickets: { userIds: [], visitors },
        supplements: [],
      })
      .expect(410, { error: Error.ItemOutOfStock });

    await database.item.update({
      data: { stock: currentVisitorStock },
      where: { id: 'ticket-visitor' },
    });

    // Clean what the test has created
    const cartItems = await database.cartItem.findMany();

    // Check that there are 3 carts items in case previous tests hasn't correctly been cleaned
    expect(cartItems.length).to.be.equal(3);

    const visitorIds = cartItems.map((cartItem) => cartItem.forUserId);

    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany({ where: { id: { in: visitorIds } } });
  });

  it('should fail with an internal server error (inner try/catch)', async () => {
    sandbox.stub(cartOperations, 'createCart').throws('Unexpected error');

    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCart)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail with an internal server error (outer try/catch)', async () => {
    sandbox.stub(itemOperations, 'fetchItems').throws('Unexpected error');

    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validCart)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should successfuly create a cart', async () => {
    const { body } = await request(app)
      .post(`/users/${user.id}/carts`)
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
    const visitor = users.find((findUser) => findUser.type === UserType.visitor);

    expect(body.url).to.startWith(env.etupay.url);

    // player place + player reduced price + coach place + visitor place + 4 * ethernet-7
    expect(body.price).to.be.equal(1500 + 1100 + 1200 + 1200 + 4 * 1000);

    expect(carts).to.have.lengthOf(1);
    expect(cartItems).to.have.lengthOf(5);
    expect(users).to.have.lengthOf(4);

    expect(cartItems.filter((cartItem) => cartItem.forUserId === user.id)).to.have.lengthOf(2);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === coach.id)).to.have.lengthOf(1);
    expect(cartItems.filter((cartItem) => cartItem.forUserId === visitor.id)).to.have.lengthOf(1);

    expect(supplement.quantity).to.be.equal(validCart.supplements[0].quantity);

    expect(visitor.firstname).to.be.equal(validCart.tickets.visitors[0].firstname);
    expect(visitor.lastname).to.be.equal(validCart.tickets.visitors[0].lastname);
  });
});
