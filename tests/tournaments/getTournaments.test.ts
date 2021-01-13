import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error } from '../../src/types';

describe('GET /tournaments', () => {
  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournaments').throws('Unexpected error');

    await request(app).get('/tournaments').expect(500, { error: Error.Unknown });
  });

  it('should return 200 with an array of tournaments', async () => {
    const tournaments = await database.tournament.findMany();
    const response = await request(app).get('/tournaments').expect(200);
    response.body.should.to.have.lengthOf(tournaments.length);
    response.body[1].should.to.have.all.keys([...Object.keys(tournaments[1]), 'lockedTeamsCount']);
    response.body[2].lockedTeamsCount.should.be.a('number');
  });
});
