import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeConfirmedUser } from '../utils';
import { generateToken } from '../../src/utils/user';

describe.only('POST /users/:userId/carts', () => {
  let user: User;
  let token: string;

  const cart: { tickets: string[] } = {
    tickets: [],
  };

  before(async () => {
    user = await createFakeConfirmedUser();
    token = generateToken(user);
    cart.tickets.push(user.id);
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should fail because the user is not itself', async () => {
    const otherUser = await createFakeConfirmedUser();
    const otherToken = generateToken(otherUser);

    await request(app)
      .post(`/users/${user.id}/carts`)
      .send(cart)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403, Error.NotSelf);
  });

  it('should fail because the body is missing', async () => {
    await request(app)
      .post(`/users/${user.id}/carts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400, Error.InvalidBody);
  });

  it.skip('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournaments').throws('Unexpected error');

    await request(app).get('/users/:userId/carts').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of tournaments', async () => {
    const tournaments = await database.tournament.findMany();
    const response = await request(app).get('/users/:userId/carts').expect(200);
    response.body.should.to.have.lengthOf(tournaments.length);
    response.body[1].should.to.have.all.keys([...Object.keys(tournaments[1]), 'lockedTeamsCount', 'placesLeft']);
    response.body[2].lockedTeamsCount.should.be.a('number');
  });
});
