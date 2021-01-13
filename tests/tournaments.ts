import request from 'supertest';
import app from '../src/app';
import database from '../src/services/database';

describe('Tournaments API', () => {
  describe('GET /tournaments', () => {
    it('should return 200 with an array of tournaments', async () => {
      const tournaments = await database.tournament.findMany();
      const response = await request(app).get('/tournaments').expect(200);
      response.body.should.to.have.lengthOf(tournaments.length);
      response.body[1].should.to.have.all.keys([...Object.keys(tournaments[1]), 'lockedTeamsCount']);
      response.body[2].lockedTeamsCount.should.be.a('number');
    });
  });
});
