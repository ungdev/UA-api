import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as tournamentOperations from '../../../src/operations/tournament';
import database from '../../../src/services/database';
import { Error, Permission, Team, Tournament, User, UserType } from '../../../src/types';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import { fetchTeam, lockTeam } from '../../../src/operations/team';

describe('PATCH /admin/tournaments/{tournamentId}', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  let tournament: Tournament;
  const teams: Team[] = [];

  const validBody = {
    name: 'anothertestname',
    maxPlayers: 3,
    cashprize: 100,
    cashprizeDetails: 'test',
    displayCashprize: true,
    format: 'test',
    infos: 'test',
    casters: ['test'],
    displayCasters: true,
    display: true,
  };

  after(async () => {
    await database.cart.deleteMany();
    await database.cartItem.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
    await database.tournament.delete({ where: { id: tournament.id } });
  });

  before(async () => {
    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({type: UserType.player});
    adminToken = generateToken(admin);

    tournament = await createFakeTournament({
      id: 'test',
      name: 'test',
      playersPerTeam: 1,
      coachesPerTeam: 1,
      maxTeams: 1,
    });

    // Create 4 teams : 1 will be locked, 3 in the queue, of which 2 will be locked after tournament modifications
    for (let index = 0; index < 4; index++) {
      const team = await createFakeTeam({ members: 1, tournament: tournament.id, paid: true, name: `test-${index}` });
      teams.push(await lockTeam(team.id));
    }
    // Verify lock has been done correctly
    expect(teams[0].lockedAt).to.not.be.null;
    expect(teams[0].enteredQueueAt).to.be.null;
    for (let index = 1; index < 4; index++) {
      expect(teams[index].lockedAt).to.be.null;
      expect(teams[index].enteredQueueAt).to.not.be.null;
    }
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
    expect(tournamentDatabase.cashprize).to.equal(validBody.cashprize);
    expect(tournamentDatabase.cashprizeDetails).to.equal(validBody.cashprizeDetails);
    expect(tournamentDatabase.displayCashprize).to.equal(validBody.displayCashprize);
    expect(tournamentDatabase.format).to.equal(validBody.format);
    expect(tournamentDatabase.infos).to.equal(validBody.infos);
    expect(tournamentDatabase.casters).to.be.an('array');
    expect(tournamentDatabase.casters[0].name).to.be.equal(validBody.casters[0]);
    expect(tournamentDatabase.displayCasters).to.equal(validBody.displayCasters);
    expect(tournamentDatabase.display).to.equal(validBody.display);

    // Check what happened with queued teams
    for (let indexDatabase = 0; indexDatabase < 4; indexDatabase++) {
      const indexTeam = teams.findIndex((team) => team.id === tournamentDatabase.teams[indexDatabase].id);
      if (indexTeam === 0) {
        // Team should not have changed
        expect(tournamentDatabase.teams[indexDatabase].lockedAt?.toISOString()).to.be.equal(
          teams[indexTeam].lockedAt?.toISOString(),
        );
        expect(tournamentDatabase.teams[indexDatabase].enteredQueueAt).to.be.null;
      } else if (indexTeam === 3) {
        // Team should still be in queue
        expect(tournamentDatabase.teams[indexDatabase].lockedAt).to.be.null;
        expect(tournamentDatabase.teams[indexDatabase].enteredQueueAt?.toISOString()).to.be.equal(
          teams[indexTeam].enteredQueueAt?.toISOString(),
        );
      } else {
        // Teams 1 et 2 should be locked
        expect(tournamentDatabase.teams[indexDatabase].lockedAt?.toISOString()).to.be.equal(
          teams[indexTeam].enteredQueueAt?.toISOString(),
        );
        expect(tournamentDatabase.teams[indexDatabase].enteredQueueAt).to.be.null;
      }
      teams[indexTeam] = await fetchTeam(teams[indexTeam].id);
    }
  });

  it('should successfully decrease the size of the tournament', async () => {
    // First increase the size, to be able to decrease it
    await database.tournament.update({ where: { id: tournament.id }, data: { maxPlayers: 5 } });
    // Decrease it once (check that nothing goes wrong if the tournament will still have places left after the operation)
    // And then twice (check that nothing goes wrong if the tournament is full after the operation)
    for (const maxPlayers of [4, 3]) {
      await request(app)
        .patch(`/admin/tournaments/${tournament.id}`)
        .send({ maxPlayers })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const tournamentDatabase = await tournamentOperations.fetchTournament(tournament.id);
      // Check what happened with queued teams
      for (let indexDatabase = 0; indexDatabase < 4; indexDatabase++) {
        const indexTeam = teams.findIndex((team) => team.id === tournamentDatabase.teams[indexDatabase].id);
        // Team should not have changed
        expect(tournamentDatabase.teams[indexDatabase].lockedAt?.toISOString()).to.be.equal(
          teams[indexTeam].lockedAt?.toISOString(),
        );
        expect(tournamentDatabase.teams[indexDatabase].enteredQueueAt?.toISOString()).to.be.equal(
          teams[indexTeam].enteredQueueAt?.toISOString(),
        );
      }
    }
  });

  it('should throw an error as their are too many locked teams to reduce the maximum number of teams', async () => {
    await request(app)
      .patch(`/admin/tournaments/${tournament.id}`)
      .send({ maxPlayers: 2 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.TooMuchLockedTeams });

    const tournamentDatabase = await tournamentOperations.fetchTournament(tournament.id);
    expect(tournamentDatabase.maxPlayers).to.equal(validBody.maxPlayers);
  });
});
