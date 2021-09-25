import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as itemOperations from '../../src/operations/item';
import database from '../../src/services/database';
import { Error, User, Team } from '../../src/types';
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

  before(async () => {
    // This user should have the ssbu discount
    team = await createFakeTeam({ tournament: 'ssbu' });
    captain = getCaptain(team);
    captainToken = generateToken(captain);

    // This user shouldn't have the ssbu discount
    otherTeam = await createFakeTeam({ tournament: 'lolCompetitive' });
    otherCaptain = getCaptain(otherTeam);
    otherCaptainToken = generateToken(otherCaptain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(itemOperations, 'fetchAllItems').throws('Unexpected error');

    await request(app).get('/items').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of items', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').expect(200);

    // without the "discount-switch-ssbu" item
    expect(response.body).to.have.lengthOf(items.length - 1);
  });

  it('should return 200 with an array of items with the "discount-switch-ssbu" item', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').set('Authorization', `Bearer ${captainToken}`).expect(200);

    // with the "discount-switch-ssbu" item
    expect(response.body).to.have.lengthOf(items.length);
  });

  it('should return 200 with an array of items without the "discount-switch-ssbu" item', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').set('Authorization', `Bearer ${otherCaptainToken}`).expect(200);

    // without the "discount-switch-ssbu" item
    expect(response.body).to.have.lengthOf(items.length - 1);
  });
});
