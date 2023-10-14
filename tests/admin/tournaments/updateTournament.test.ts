import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as tournamentOperations from '../../../src/operations/tournament';
import database from '../../../src/services/database';
import { Error, Permission, Tournament, User, UserType } from '../../../src/types';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import { fetchTournaments } from '../../../src/operations/tournament';

describe('PATCH /admin/tournaments/{tournamentId}', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  let tournaments: Tournament[];

  const validBody = {
    name: 'test',
    maxPlayers: 100,
    playersPerTeam: 5,
    cashprize: 100,
    cashprizeDetails: 'test',
    displayCashprize: true,
    format: 'test',
    infos: 'test',
    casters: ['test'],
    displayCasters: true,
    display: true,
    position: 150,
  };

  after(async () => {
    await database.user.deleteMany();
  });

  before(async () => {
    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser();
    adminToken = generateToken(admin);

    tournaments = await fetchTournaments();
  });

  it('should error as the user is not authenticated', () =>
    request(app)
      .patch(`/admin/tournaments/${tournaments[0].id}`)
      .send(validBody)
      .expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .patch(`/admin/tournaments/${tournaments[0].id}`)
      .send(validBody)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'updateTournament').throws('Unexpected error');

    await request(app)
      .patch(`/admin/tournaments/${tournaments[0].id}`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it("should throw an error as tournament's id does not exist", async () => {
    await request(app)
      .patch('/admin/tournaments/aaaaaa')
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.NotFound });
  });

  it('should successfully update the tournament', async () => {
    await request(app)
      .patch(`/admin/tournaments/${tournaments[0].id}`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const tournament = await tournamentOperations.fetchTournament(tournaments[0].id);

    expect(tournament.name).to.equal(validBody.name);
    expect(tournament.maxPlayers).to.equal(validBody.maxPlayers);
    expect(tournament.playersPerTeam).to.equal(validBody.playersPerTeam);
    expect(tournament.cashprize).to.equal(validBody.cashprize);
    expect(tournament.cashprizeDetails).to.equal(validBody.cashprizeDetails);
    expect(tournament.displayCashprize).to.equal(validBody.displayCashprize);
    expect(tournament.format).to.equal(validBody.format);
    expect(tournament.infos).to.equal(validBody.infos);
    expect(tournament.casters).to.be.an('array');
    expect(tournament.casters[0].name).to.be.equal(validBody.casters[0]);
    expect(tournament.displayCasters).to.equal(validBody.displayCasters);
    expect(tournament.display).to.equal(validBody.display);
    expect(tournament.position).to.equal(150);
  });
});
