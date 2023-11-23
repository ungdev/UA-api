import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import * as cartOperations from '../../../src/operations/carts';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { fetchAllItems } from '../../../src/operations/item';

describe('GET /admin/users/:userId/carts', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    user = await createFakeUser({ type: UserType.player });
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/users/${user.id}/carts`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .get(`/admin/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not found', () =>
    request(app)
      .get('/admin/users/A12B3C/carts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound }));

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(cartOperations, 'fetchCarts').throws('Unexpected error');

    await request(app)
      .get(`/admin/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return an empty cart', () =>
    request(app).get(`/admin/users/${user.id}/carts`).set('Authorization', `Bearer ${adminToken}`).expect(200, []));

  it('should return a pending cart', async () => {
    await cartOperations.createCart(user.id, [
      {
        itemId: 'ethernet-7',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ethernet-7').price,
        forUserId: user.id,
      },
    ]);

    const carts = await cartOperations.fetchCarts(user.id);
    const [cart] = carts;
    const [cartItem] = cart.cartItems;

    const items = await fetchAllItems();
    const item = items.find((findItem) => findItem.id === 'ethernet-7');

    await request(app)
      .get(`/admin/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, [
        {
          id: cart.id,
          userId: user.id,
          transactionState: cart.transactionState,
          paidAt: null,
          transactionId: null,
          totalPrice: item.price,
          cartItems: [
            {
              id: cartItem.id,
              quantity: 1,
              price: 1000,
              reducedPrice: null,
              forcePaid: false,
              cartId: cart.id,
              item: {
                name: item.name,
                id: 'ethernet-7',
              },
              forUser: {
                id: user.id,
                username: user.username,
              },
            },
          ],
        },
      ]);
  });

  it('should return a cart with only one discount', async () => {
    // Delete previous carts
    await database.cart.deleteMany();

    // Create price-reduced account
    const partnerSchoolUser = await createFakeUser({
      email: 'someone@utt.fr',
      type: UserType.player,
    });

    // Create a cart, containing a reduced-price ticket, a full-price ticket and another
    // random item
    await cartOperations.createCart(partnerSchoolUser.id, [
      {
        itemId: 'ethernet-7',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ethernet-7').price,
        forUserId: partnerSchoolUser.id,
      },
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-player').reducedPrice,
        forUserId: partnerSchoolUser.id,
      },
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-player').price,
        forUserId: user.id,
      },
    ]);

    // Retrieve cart from database
    const [cart] = await cartOperations.fetchCarts(partnerSchoolUser.id);
    const ethernetCable = cart.cartItems.find((item) => item.itemId === 'ethernet-7');
    const ticketPartner = cart.cartItems.find(
      (item) => item.forUserId === partnerSchoolUser.id && item.itemId === 'ticket-player',
    );
    const ticketRegular = cart.cartItems.find((item) => item.forUserId === user.id && item.itemId === 'ticket-player');

    const items = await fetchAllItems();
    const ethernetCableItem = items.find((findItem) => findItem.id === 'ethernet-7');
    const ticketItem = items.find((findItem) => findItem.id === 'ticket-player');

    // Send query and check result body
    const result = await request(app)
      .get(`/admin/users/${partnerSchoolUser.id}/carts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(result.body[0].id).to.be.equal(cart.id);
    expect(result.body[0].userId).to.be.equal(partnerSchoolUser.id);
    expect(result.body[0].transactionState).to.be.equal(cart.transactionState);
    expect(result.body[0].paidAt).to.be.null;
    expect(result.body[0].transactionId).to.be.null;
    expect(result.body[0].totalPrice).to.be.equal(ethernetCableItem.price + ticketItem.reducedPrice + ticketItem.price);
    expect(result.body[0].cartItems).to.have.lengthOf(3);
    return expect(result.body[0].cartItems).to.deep.include.members([
      {
        id: ethernetCable.id,
        quantity: 1,
        cartId: cart.id,
        item: {
          name: ethernetCableItem.name,
          id: ethernetCableItem.id,
        },
        forUser: {
          id: partnerSchoolUser.id,
          username: partnerSchoolUser.username,
        },
        forcePaid: false,
        price: 1000,
        reducedPrice: null,
      },
      {
        id: ticketPartner.id,
        quantity: 1,
        cartId: cart.id,
        item: {
          name: ticketItem.name,
          id: ticketItem.id,
        },
        forUser: {
          username: partnerSchoolUser.username,
          id: partnerSchoolUser.id,
        },
        forcePaid: false,
        price: 2000,
        reducedPrice: null,
      },
      {
        id: ticketRegular.id,
        quantity: 1,
        cartId: cart.id,
        item: {
          name: ticketItem.name,
          id: ticketItem.id,
        },
        forUser: {
          id: user.id,
          username: user.username,
        },
        forcePaid: false,
        price: 2500,
        reducedPrice: null,
      },
    ]);
  });
});
