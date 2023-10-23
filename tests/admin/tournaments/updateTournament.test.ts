import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as tournamentOperations from '../../../src/operations/tournament';
import database from '../../../src/services/database';
import { Error, Permission, Tournament, User, UserType } from '../../../src/types';
import { createFakeTournament, createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';

describe('PATCH /admin/tournaments/{tournamentId}', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  let tournament: Tournament;

  const validBody = {
    name: 'anothertestname',
    maxPlayers: 100,
    playersPerTeam: 5,
    coachesPerTeam: 2,
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
    await database.tournament.delete({ where: { id: tournament.id } });
  });

  before(async () => {
    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser();
    adminToken = generateToken(admin);

    tournament = await createFakeTournament({
      id: 'test',
      name: 'test',
      playersPerTeam: 1,
      coachesPerTeam: 1,
      maxTeams: 1,
    });
  });

  it('should error as the user is not authenticated', () =>
    request(app)
      .patch(`/admin/tournaments/${tournament.id}`)
      .send(validBody)
      .expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .patch(`/admin/tournaments/${tournament.id}`)
      .send(validBody)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'updateTournament').throws('Unexpected error');

    await request(app)
      .patch(`/admin/tournaments/${tournament.id}`)
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

  it('should fail as a tournament already has this name', async () => {
    await request(app)
      .patch(`/admin/tournaments/${tournament.id}`)
      .send({ name: 'Pokémon' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409, { error: Error.TournamentNameAlreadyExists });
  });

  it('should successfully update the tournament', async () => {
    await request(app)
      .patch(`/admin/tournaments/${tournament.id}`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const tournamentDatabase = await tournamentOperations.fetchTournament(tournament.id);

    expect(tournamentDatabase.name).to.equal(validBody.name);
    expect(tournamentDatabase.maxPlayers).to.equal(validBody.maxPlayers);
    expect(tournamentDatabase.playersPerTeam).to.equal(validBody.playersPerTeam);
    expect(tournamentDatabase.coachesPerTeam).to.equal(validBody.coachesPerTeam);
    expect(tournamentDatabase.cashprize).to.equal(validBody.cashprize);
    expect(tournamentDatabase.cashprizeDetails).to.equal(validBody.cashprizeDetails);
    expect(tournamentDatabase.displayCashprize).to.equal(validBody.displayCashprize);
    expect(tournamentDatabase.format).to.equal(validBody.format);
    expect(tournamentDatabase.infos).to.equal(validBody.infos);
    expect(tournamentDatabase.casters).to.be.an('array');
    expect(tournamentDatabase.casters[0].name).to.be.equal(validBody.casters[0]);
    expect(tournamentDatabase.displayCasters).to.equal(validBody.displayCasters);
    expect(tournamentDatabase.display).to.equal(validBody.display);
    expect(tournamentDatabase.position).to.equal(150);
  });
});
