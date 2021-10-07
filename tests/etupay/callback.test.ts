/* eslint-disable mocha/max-top-level-suites */
// Disable eslint mocha/max-top-level-suites because the etupay.ts contains two controllers

import crypto from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as cartOperations from '../../src/operations/carts';
import database from '../../src/services/database';
import { Cart, Error } from '../../src/types';
import { createFakeUser } from '../utils';
import env from '../../src/utils/env';
import { encodeToBase64, randomInt } from '../../src/utils/helpers';
import * as emailOperations from '../../src/services/email';

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

describe('POST /etupay/callback', () => {
  it('should return a valid answer', () => request(app).post('/etupay/callback').expect(200, { api: 'ok' }));
});

describe('GET /etupay/callback', () => {
  let cart: Cart;
  let paidPayload: string;
  let refusedPayload: string;

  before(async () => {
    const user = await createFakeUser();

    // Create a fake cart
    cart = await cartOperations.createCart(user.id, [{ itemId: 'ticket-player', quantity: 1, forUserId: user.id }]);

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
      { itemId: 'ticket-player', quantity: 1, forUserId: user.id },
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

  it('should successfully redirect to the success url', () => {
    // The function send email has been tested by a test unit. We skip it to not having to setup a fake SMTP server
    sandbox.stub(emailOperations, 'sendEmail').resolves();

    return request(app)
      .get(`/etupay/callback?payload=${paidPayload}`)
      .expect(302)
      .expect('Location', env.etupay.successUrl);
  });

  it('should fail as the cart is already paid', () =>
    request(app).get(`/etupay/callback?payload=${paidPayload}`).expect(403, { error: Error.AlreadyPaid }));
});
