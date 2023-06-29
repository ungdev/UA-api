/* eslint-disable mocha/max-top-level-suites */
// Disable eslint mocha/max-top-level-suites because the etupay.ts contains two controllers

import crypto from 'crypto';
import request from 'supertest';
import { expect } from 'chai';
import { UserType } from '@prisma/client';
import app from '../../src/app';
import { sandbox } from '../setup';
import database from '../../src/services/database';
import { Cart, Error, PrimitiveCartItem, Team, Tournament, TransactionState, User } from '../../src/types';
import { createFakeTeam, createFakeUser } from '../utils';
import env from '../../src/utils/env';
import { encodeToBase64, randomInt } from '../../src/utils/helpers';
import * as cartOperations from '../../src/operations/carts';
import * as network from '../../src/utils/network';
import * as emailOperations from '../../src/services/email';
import * as itemOperations from '../../src/operations/item';
import * as tournamentOperations from '../../src/operations/tournament';
import * as teamOperations from '../../src/operations/team';
import * as userOperations from '../../src/operations/user';

const createEtupayPayload = (etupayBody: object) => {
  // Strinigifies the etupay body
  const stringifiedEtupayBody = JSON.stringify(etupayBody);

  // Serializes the etupay body
  const serializedEtupayBody = `s:${stringifiedEtupayBody.length}:"${stringifiedEtupayBody}";`;

  // Use the same key as it will be used by the etupay middleware
  const key = Buffer.from(env.etupay.key, 'base64');

  // Create a random initial vector
  const initialVector = crypto.randomBytes(16);

  // Create a cipher to encrypt the body
  const cipher = crypto.createCipheriv('aes-256-cbc', key, initialVector);

  // Encrypts the etupay body
  const encryptedEtupayBody = Buffer.concat([cipher.update(serializedEtupayBody, 'utf-8'), cipher.final()]);

  // Create an HMAC based on the initial vector and the encrypted value
  const mac = crypto
    .createHmac('sha256', key)
    .update(initialVector.toString('base64') + encryptedEtupayBody.toString('base64'))
    .digest('hex');

  // Create the payload with the value encrypted in base64
  return encodeToBase64({
    iv: initialVector.toString('base64'),
    value: encryptedEtupayBody.toString('base64'),
    mac,
  });
};

const createCartAndPayload = async (
  userId: string,
  items: PrimitiveCartItem[],
  type: string,
  step: string,
): Promise<{ cart: Cart; payload: string }> => {
  let cart = await cartOperations.createCart(userId, items);
  cart = await cartOperations.updateCart(cart.id, randomInt(1e4, 1e5 - 1), TransactionState.authorization);

  // This is the data format how it is encrypted in the payload
  return {
    cart,
    payload: createEtupayPayload({
      // Create a random transaction id
      transaction_id: cart.transactionId,
      type,
      amount: items.reduce((accumulator, item) => accumulator + item.price * item.quantity, 0),
      step,
      // Create the service data as it is in the createCart controller. (It is already encoded in the data)
      service_data: encodeToBase64({ cartId: cart.id }),
    }),
  };
};

// eslint-disable-next-line func-names
describe('POST /etupay/callback', function () {
  // The setup is slow
  this.timeout(30000);

  let cart: Cart;
  let paidPayload: string;
  let refusedPayload: string;

  let lolTeam: Team;
  let lolTournament: Tournament;
  let lolPlayer1: User;
  let lolPlayer2: User;

  let csgoTeam: Team;
  let csgoPlayer: User;

  let lolTicket1Payload: string;
  let lolAndCsgoTicketsCart: Cart;
  let lolAndCsgoTicketsPayload: string;
  let lolTicket2Cart: Cart;
  let lolTicket2Payload: string;

  before(async () => {
    const user = await createFakeUser();

    // Create a fake cart
    ({ cart, payload: paidPayload } = await createCartAndPayload(
      user.id,
      [
        {
          itemId: 'ticket-player',
          quantity: 1,
          price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
          forUserId: user.id,
        },
      ],
      'checkout',
      'PAID',
    ));

    // Create a refused payload
    ({ payload: refusedPayload } = await createCartAndPayload(
      user.id,
      [
        {
          itemId: 'ticket-player',
          quantity: 1,
          price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
          forUserId: user.id,
        },
      ],
      'checkout',
      'REFUSED',
    ));

    // Store the promises, to wait them all at the same time
    const promises = [];

    lolTournament = await tournamentOperations.fetchTournament('lol');
    lolTeam = await createFakeTeam({ members: lolTournament.playersPerTeam, tournament: 'lol' });
    // Fill the tournament
    for (let index = 0; index < lolTournament.placesLeft; index++) {
      promises.push(createFakeTeam({ members: lolTournament.playersPerTeam, tournament: 'lol', locked: true }));
    }
    // Fetch the first 2 players, and force pay the others
    [lolPlayer1, lolPlayer2] = lolTeam.players;
    for (const player of lolTeam.players.slice(2)) await cartOperations.forcePay(player);

    const csgoTournament = await tournamentOperations.fetchTournament('csgo');
    csgoTeam = await createFakeTeam({ members: csgoTournament.playersPerTeam, tournament: 'csgo' });
    [csgoPlayer] = csgoTeam.players;
    for (const player of csgoTeam.players.slice(1)) promises.push(cartOperations.forcePay(player));

    // Await all the operations
    await Promise.all(promises);

    // Refresh the tournament
    lolTournament = await tournamentOperations.fetchTournament('lol');

    ({ payload: lolTicket1Payload } = await createCartAndPayload(
      lolPlayer1.id,
      [
        {
          itemId: 'ticket-player',
          quantity: 1,
          price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
          forUserId: lolPlayer1.id,
        },
      ],
      'checkout',
      'PAID',
    ));
    ({ cart: lolAndCsgoTicketsCart, payload: lolAndCsgoTicketsPayload } = await createCartAndPayload(
      lolPlayer2.id,
      [
        {
          itemId: 'ticket-player',
          quantity: 1,
          price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
          forUserId: lolPlayer2.id,
        },
        {
          itemId: 'ticket-player',
          quantity: 1,
          price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
          forUserId: csgoPlayer.id,
        },
      ],
      'checkout',
      'PAID',
    ));
    ({ cart: lolTicket2Cart, payload: lolTicket2Payload } = await createCartAndPayload(
      lolPlayer2.id,
      [
        {
          itemId: 'ticket-player',
          quantity: 1,
          price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
          forUserId: lolPlayer2.id,
        },
      ],
      'checkout',
      'PAID',
    ));
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the payload is missing', () =>
    request(app).post('/etupay/callback').expect(400, { error: Error.InvalidQueryParameters }));

  it('should fail because not accessed from etupay', () =>
    request(app).post(`/etupay/callback?payload=${paidPayload}`).expect(403, { error: Error.EtupayNoAccess }));

  it('should fail because the payload is invalid', () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    return request(app)
      .post('/etupay/callback?payload=invalidPayload')
      .expect(400, { error: Error.InvalidQueryParameters });
  });

  it("should fail because the cart wasn't found", async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    // Update the cart id to make him not found
    const savedCart = cart;

    await database.cart.update({
      data: { id: 'A1B2C3' },
      where: { id: cart.id },
    });

    await request(app).post(`/etupay/callback?payload=${paidPayload}`).expect(404, { error: Error.CartNotFound });

    // Reupdate the cart to make him having the previous id
    await database.cart.update({
      data: { id: savedCart.id },
      where: { id: 'A1B2C3' },
    });
  });

  it('should return an internal server error', async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    sandbox.stub(cartOperations, 'fetchCart').throws('Unexpected error');
    await request(app)
      .post(`/etupay/callback?payload=${paidPayload}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should respond api ok to update rejected payment', () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    return request(app).post(`/etupay/callback?payload=${refusedPayload}`).expect(200, { api: 'ok' });
  });

  it('reject as the payment was not authorized', async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');

    const user = await createFakeUser();

    // Create a refused payload
    const failedCart = await cartOperations.createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
        forUserId: user.id,
      },
    ]);
    await cartOperations.updateCart(failedCart.id, randomInt(1e4, 1e5 - 1), TransactionState.refused);
    const etupayBody = {
      // Create a random transaction id
      transaction_id: cart.transactionId,
      type: 'checkout',
      // We bought a ticket for a player, so 15€ (the price doesn't matter now),
      amount: 1500,
      step: 'PAID',
      // Create the service data as it is in the createCart controller. (It is already encoded in the data)
      service_data: encodeToBase64({ cartId: failedCart.id }),
    };
    refusedPayload = createEtupayPayload(etupayBody);

    return request(app).post(`/etupay/callback?payload=${refusedPayload}`).expect(403, { error: Error.AlreadyErrored });
  });

  it('should respond api ok', () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    // The function send email has been tested by a test unit. We skip it to not having to setup a fake SMTP server
    sandbox.stub(emailOperations, 'sendEmail').resolves();

    return request(app).post(`/etupay/callback?payload=${paidPayload}`).expect(200, { api: 'ok' });
  });

  it('should fail as the cart is already paid', () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    return request(app).post(`/etupay/callback?payload=${paidPayload}`).expect(403, { error: Error.AlreadyPaid });
  });

  it("should respond api ok, and not lock the LOL team because everyone hasn't payed", async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    sandbox.stub(emailOperations, 'sendEmail').resolves();
    await request(app).post(`/etupay/callback?payload=${lolTicket1Payload}`).expect(200, { api: 'ok' });
    const lolTeamFromDatabase = await database.team.findUnique({ where: { id: lolTeam.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;
    // There is no reason it would change, but we're better safe than sorry
    const csgoTeamFromDatabase = await database.team.findUnique({ where: { id: csgoTeam.id } });
    expect(csgoTeamFromDatabase.lockedAt).to.be.null;
    expect(csgoTeamFromDatabase.enteredQueueAt).to.be.null;
  });

  it('should respond api ok, lock the csgo team but not and place the lol team in the queue', async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    sandbox.stub(emailOperations, 'sendEmail').resolves();

    await request(app).post(`/etupay/callback?payload=${lolAndCsgoTicketsPayload}`).expect(200, { api: 'ok' });
    const lolTeamFromDatabase = await database.team.findUnique({ where: { id: lolTeam.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.not.be.null;
    const csgoTeamFromDatabase = await database.team.findUnique({ where: { id: csgoTeam.id } });
    expect(csgoTeamFromDatabase.lockedAt).to.be.not.null;
    expect(csgoTeamFromDatabase.enteredQueueAt).to.be.null;

    // Cancel the payment
    lolAndCsgoTicketsCart = await cartOperations.updateCart(
      lolAndCsgoTicketsCart.id,
      lolAndCsgoTicketsCart.transactionId,
      TransactionState.canceled,
    );
    await teamOperations.unlockTeam(lolTeam.id);
    await teamOperations.unlockTeam(csgoTeam.id);
  });

  it('should respond api ok, and not lock the LOL team because the team is not full', async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    sandbox.stub(emailOperations, 'sendEmail').resolves();

    // Remove a player from the team
    const removedUser = await teamOperations.kickUser(
      lolTeam.players.find((player: User) => player.id !== lolTeam.captainId && player.id !== lolPlayer2.id),
    );

    // This will be called twice, in two different circumstances
    const makeTest = async () => {
      await request(app).post(`/etupay/callback?payload=${lolTicket2Payload}`).expect(200, { api: 'ok' });
      const lolTeamFromDatabase = await database.team.findUnique({ where: { id: lolTeam.id } });
      expect(lolTeamFromDatabase.lockedAt).to.be.null;
      expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;
      // Make the cart not paid
      lolTicket2Cart = await cartOperations.updateCart(
        lolTicket2Cart.id,
        lolTicket2Cart.transactionId,
        TransactionState.authorization,
      );
    };

    // Test with the tournament not full
    // Remove a team from the tournament
    const unlockedTeam = await teamOperations.unlockTeam(
      lolTournament.teams.find((team: Team) => team.id !== lolTeam.id).id,
    );
    await makeTest();
    // Lock back the team
    await teamOperations.lockTeam(unlockedTeam.id);
    // Test with the tournament full
    await makeTest();

    // Add back the player
    // We need to re-fetch the user because we don't have enough data returned from the kickUser function
    await teamOperations.joinTeam(lolTeam.id, await userOperations.fetchUser(removedUser.id), UserType.player);
  });

  it('should respond api ok, and add the LOL team to the queue', async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    sandbox.stub(emailOperations, 'sendEmail').resolves();

    // Verify the team is not already locked
    let lolTeamFromDatabase = await database.team.findUnique({ where: { id: lolTeam.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;

    await request(app).post(`/etupay/callback?payload=${lolTicket2Payload}`).expect(200, { api: 'ok' });
    lolTeamFromDatabase = await database.team.findUnique({ where: { id: lolTeam.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.not.null;
    // Unlock the team for the next test
    await teamOperations.unlockTeam(lolTeam.id);

    // Make the cart not paid
    lolTicket2Cart = await cartOperations.updateCart(
      lolTicket2Cart.id,
      lolTicket2Cart.transactionId,
      TransactionState.authorization,
    );
  });

  it('should respond api ok, and lock the team because there is enough place in the tournament', async () => {
    sandbox.stub(network, 'getIp').returns('10.0.0.0');
    sandbox.stub(emailOperations, 'sendEmail').resolves();

    // Verify the team is not already locked
    let lolTeamFromDatabase = await database.team.findUnique({ where: { id: lolTeam.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;

    // Remove a team from the tournament
    const unlockedTeam = await teamOperations.unlockTeam(
      lolTournament.teams.find((team: Team) => team.id !== lolTeam.id).id,
    );
    await request(app).post(`/etupay/callback?payload=${lolTicket2Payload}`).expect(200, { api: 'ok' });
    lolTeamFromDatabase = await database.team.findUnique({ where: { id: lolTeam.id } });
    expect(lolTeamFromDatabase.lockedAt).to.be.not.null;
    expect(lolTeamFromDatabase.enteredQueueAt).to.be.null;
    // Lock back the team
    await teamOperations.lockTeam(unlockedTeam.id);
  });
});

describe('GET /etupay/callback', () => {
  let cart: Cart;
  let paidPayload: string;
  let refusedPayload: string;

  before(async () => {
    const user = await createFakeUser();

    // Create a fake cart
    cart = await cartOperations.createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
        forUserId: user.id,
      },
    ]);

    // This is the data format how it is encrypted in the payload
    const etupayBody = {
      // Create a random transaction id
      transaction_id: randomInt(1e4, 1e5 - 1),
      type: 'checkout',
      // We bought a ticket for a player, so 15€ (the price doesn't matter now),
      amount: 1500,
      step: 'PAID',
      // Create the service data as it is in the createCart controller. (It is already encoded in the data)
      service_data: encodeToBase64({ cartId: cart.id }),
    };

    // Create a paid payload
    paidPayload = createEtupayPayload(etupayBody);

    // Create a refused payload
    const failedCart = await cartOperations.createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await itemOperations.fetchAllItems()).find((item) => item.id === 'ticket-player').price,
        forUserId: user.id,
      },
    ]);
    etupayBody.step = 'REFUSED';
    etupayBody.service_data = encodeToBase64({ cartId: failedCart.id });
    refusedPayload = createEtupayPayload(etupayBody);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the payload is missing', () =>
    request(app).get('/etupay/callback').expect(400, { error: Error.InvalidQueryParameters }));

  it('should fail because the payload is invalid', () =>
    request(app).get('/etupay/callback?payload=invalidPayload').expect(400, { error: Error.InvalidQueryParameters }));

  it("should fail because the cart wasn't found", async () => {
    // Update the cart id to make him not found
    const savedCart = cart;

    await database.cart.update({
      data: { id: 'A1B2C3' },
      where: { id: cart.id },
    });

    await request(app).get(`/etupay/callback?payload=${paidPayload}`).expect(404, { error: Error.CartNotFound });

    // Reupdate the cart to make him having the previous id
    await database.cart.update({
      data: { id: savedCart.id },
      where: { id: 'A1B2C3' },
    });
  });

  it('should return an internal server error', async () => {
    sandbox.stub(cartOperations, 'fetchCart').throws('Unexpected error');
    await request(app).get(`/etupay/callback?payload=${paidPayload}`).expect(500, { error: Error.InternalServerError });
  });

  it('should redirect to the error URL as the payment was rejected', () =>
    request(app).get(`/etupay/callback?payload=${refusedPayload}`).expect(302).expect('Location', env.etupay.errorUrl));

  it('should reject as the payment is already errored', () =>
    request(app).get(`/etupay/callback?payload=${refusedPayload}`).expect(403, { error: Error.AlreadyErrored }));

  it('should successfully redirect to the success url', () =>
    request(app).get(`/etupay/callback?payload=${paidPayload}`).expect(302).expect('Location', env.etupay.successUrl));

  it('should fail as the cart is already paid', () =>
    request(app).get(`/etupay/callback?payload=${paidPayload}`).expect(403, { error: Error.AlreadyPaid }));
});
