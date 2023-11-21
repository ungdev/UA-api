import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as tournamentOperations from '../../../src/operations/tournament';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakeTeam, createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';

describe('GET /admin/tournaments', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  before(async () => {
    await database.tournament.updateMany({
      data: {
        display: true,
        displayCashprize: true,
        displayCasters: true,
      },
    });
    admin = await createFakeUser({ permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({ type: UserType.player });
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/tournaments`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .get(`/admin/tournaments`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournaments').throws('Unexpected error');

    await request(app)
      .get('/admin/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of tournaments', async () => {
    const tournaments = await database.tournament.findMany();

    // add display false to a random tournament
    await database.tournament.update({
      where: {
        id: tournaments[0].id,
      },
      data: {
        display: false,
      },
    });

    await createFakeTeam({ members: tournaments[0].playersPerTeam, tournament: tournaments[0].id });

    const response = await request(app)
      .get('/admin/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).to.have.lengthOf(tournaments.length);
    // Not to have tournaments[0] because it has display false
    expect(response.body).not.to.have.deep.members([tournaments[0]]);
    expect(response.body[0]).to.have.all.keys([
      'id',
      'name',
      'maxPlayers',
      'lockedTeamsCount',
      'teams',
      'placesLeft',
      'playersPerTeam',
      'coachesPerTeam',
      'cashprize',
      'casters',
      'infos',
      'format',
      'cashprizeDetails',
      'display',
      'displayCashprize',
      'displayCasters',
      'discordRespoRoleId',
      'discordRoleId',
      'discordTextCategoryId',
      'discordVocalCategoryId',
      'position',
    ]);
    expect(response.body[0].lockedTeamsCount).to.be.a('number');
    expect(response.body[0].cashprize).to.be.a('number');
    expect(response.body[0].casters).to.be.a('array');
  });

  it('should return 200 with an array of tournaments with the right fields', async () => {
    const tournaments = await database.tournament.findMany();

    await database.tournament.update({
      where: {
        id: tournaments[0].id,
      },
      data: {
        display: true,
        displayCashprize: false,
        displayCasters: false,
      },
    });

    const response = await request(app)
      .get('/admin/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).to.have.lengthOf(tournaments.length);
    expect(response.body[0]).to.have.all.keys([
      'id',
      'name',
      'maxPlayers',
      'lockedTeamsCount',
      'teams',
      'placesLeft',
      'playersPerTeam',
      'coachesPerTeam',
      'cashprize',
      'casters',
      'infos',
      'format',
      'cashprizeDetails',
      'display',
      'displayCashprize',
      'displayCasters',
      'discordRespoRoleId',
      'discordRoleId',
      'discordTextCategoryId',
      'discordVocalCategoryId',
      'position',
    ]);
    expect(response.body[1].lockedTeamsCount).to.be.a('number');
    expect(response.body[0].cashprize).to.be.a('number');
    expect(response.body[0].casters).to.be.a('array');
  });
});
