import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error } from '../../src/types';
import { createFakeTeam } from '../utils';

describe('GET /tournaments', () => {
  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournaments').throws('Unexpected error');

    await request(app).get('/tournaments').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of tournaments', async () => {
    const tournaments = await database.tournament.findMany();

    await createFakeTeam({ members: tournaments[0].playersPerTeam, tournament: tournaments[0].id });

    const response = await request(app).get('/tournaments').expect(200);

    expect(response.body).to.have.lengthOf(tournaments.length);
    expect(response.body[0]).to.have.all.keys([
      'id',
      'name',
      'maxPlayers',
      'lockedTeamsCount',
      'teams',
      'placesLeft',
      'playersPerTeam',
    ]);
    expect(response.body[0].lockedTeamsCount).to.be.a('number');
    expect(response.body[0].teams[0].players[0].id).to.be.a('string');
    expect(response.body[0].teams[0].players[0].firstname).to.be.undefined;
  });
});
