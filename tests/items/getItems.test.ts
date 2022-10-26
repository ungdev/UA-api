import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as itemOperations from '../../src/operations/item';
import * as cartOperations from '../../src/operations/carts';
import database from '../../src/services/database';
import { Error, User, Team, TransactionState, Cart, Item } from '../../src/types';
import { createFakeTeam } from '../utils';
import { getCaptain } from '../../src/utils/teams';
import { generateToken } from '../../src/utils/users';

describe('GET /items', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;
  let otherCaptain: User;
  let otherTeam: Team;
  let otherCaptainToken: string;
  let thirdCaptain: User;
  let thirdTeam: Team;
  let thirdCaptainToken: string;
  let thirdCaptainCart: Cart;

  before(async () => {
    // This user should have the ssbu discount
    team = await createFakeTeam({ tournament: 'ssbu' });
    captain = getCaptain(team);
    captainToken = generateToken(captain);

    // This user shouldn't have the ssbu discount
    otherTeam = await createFakeTeam({ tournament: 'lol' });
    otherCaptain = getCaptain(otherTeam);
    otherCaptainToken = generateToken(otherCaptain);

    // This user already has the ssbu discount
    thirdTeam = await createFakeTeam({ tournament: 'ssbu' });
    thirdCaptain = getCaptain(thirdTeam);
    thirdCaptainToken = generateToken(thirdCaptain);
    thirdCaptainCart = await cartOperations.createCart(thirdCaptain.id, [
      { itemId: 'discount-switch-ssbu', quantity: 1, price: -3, forUserId: thirdCaptain.id },
    ]);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(itemOperations, 'fetchAllItems').throws('Unexpected error');

    await request(app).get('/items').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of items', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').expect(200);

    // without the "discount-switch-ssbu" item and the "ticket-player-ssbu"
    expect(response.body).to.have.lengthOf(items.length - 2);
  });

  it('should return 200 with an array of items with the "discount-switch-ssbu" item', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').set('Authorization', `Bearer ${captainToken}`).expect(200);

    // with the "discount-switch-ssbu" item but without the legacy "ticket-player"
    expect(response.body).to.have.lengthOf(items.length - 1);
  });

  it(`should return 200 with an array of items with the "discount-switch-ssbu" and a quantity of -1 item because user has a pending cart containing it`, async () => {
    await cartOperations.updateCart(thirdCaptainCart.id, 123, TransactionState.pending);
    const items = await database.item.findMany();
    const response = await request(app).get('/items').set('Authorization', `Bearer ${thirdCaptainToken}`).expect(200);

    // without the legacy "ticket-player"
    expect(response.body).to.have.lengthOf(items.length - 1);
    expect(response.body.find((item: Item) => item.id === 'discount-switch-ssbu').left).to.be.equal(-1);
  });

  it(`should return 200 with an array of items without the "discount-switch-ssbu" item because user has a paid cart containing it`, async () => {
    await cartOperations.updateCart(thirdCaptainCart.id, 123, TransactionState.paid);
    const items = await database.item.findMany();
    const response = await request(app).get('/items').set('Authorization', `Bearer ${thirdCaptainToken}`).expect(200);

    // without the "discount-switch-ssbu" item and the legacy "ticket-player"
    expect(response.body).to.have.lengthOf(items.length - 2);
  });

  describe('should return 200 with an array of items with the "discount-switch-ssbu" item because user has a cart containing it, but it was not paid nor it is pending', () => {
    for (const transactionState of [TransactionState.canceled, TransactionState.refunded, TransactionState.refused]) {
      it(`should return 200 with array of items with the "discount-switch-ssbu" item because user has a cart containing it, but it was ${transactionState}`, async () => {
        // update cart's transactionState
        await cartOperations.updateCart(thirdCaptainCart.id, 123, transactionState);
        const items = await database.item.findMany();
        const response = await request(app)
          .get('/items')
          .set('Authorization', `Bearer ${thirdCaptainToken}`)
          .expect(200);

        // with the "discount-switch-ssbu" item but without the legaycy "ticket-player"
        expect(response.body).to.have.lengthOf(items.length - 1);
      });
    }
  });

  it('should return 200 with an array of items with the "discount-switch-ssbu" with a quantity of 1', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').set('Authorization', `Bearer ${otherCaptainToken}`).expect(200);

    // without the "discount-switch-ssbu" item and the "ticket-player-ssbu"
    expect(response.body).to.have.lengthOf(items.length - 2);
  });

  it('should return items with their stock', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').expect(200);

    for (const responseItem of response.body)
      expect(responseItem.left ?? null).to.be.equal(items.find((item) => item.name === responseItem.name).stock);
  });
});
