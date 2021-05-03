import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app';
import database from '../src/services/database';

describe('Tournaments API', () => {
  describe('GET /tournaments', () => {
    it('should return 200 with an array of tournaments', async () => {
      const tournaments = await database.tournament.findMany();
      const response = await request(app).get('/tournaments').expect(200);

      expect(response.body).to.have.lengthOf(tournaments.length);
      expect(response.body[1]).to.have.all.keys([...Object.keys(tournaments[1]), 'lockedTeamsCount']);
      expect(response.body[2].lockedTeamsCount).to.be.a('number');
    });
  });
});
