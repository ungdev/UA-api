import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error } from '../../src/types';
import { fetchTeams } from '../../src/operations/team';

describe('GET /tournaments', () => {
  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournaments').throws('Unexpected error');

    await request(app).get('/tournaments').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of tournaments', async () => {
    const tournaments = await database.tournament.findMany();
    const teams = await fetchTeams(tournaments[1].id);
    const response = await request(app).get('/tournaments').expect(200);

    expect(response.body).to.have.lengthOf(tournaments.length);
    expect(response.body[1]).to.have.all.keys([...Object.keys(tournaments[1]), 'lockedTeamsCount', teams, 'placesLeft']);
    expect(response.body[2].lockedTeamsCount).to.be.a('number');
  });
});
