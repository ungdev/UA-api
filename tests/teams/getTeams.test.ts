import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamsOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error } from '../../src/types';
import { createFakeTeam } from '../utils';

describe('GET /teams', () => {
  before(async () => {
    await createFakeTeam();
    await createFakeTeam({ locked: true });
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamsOperations, 'fetchTeams').throws('Unexpected error');

    await request(app).get('/teams?tournamentId=lol').expect(500, { error: Error.InternalServerError });
  });

  it('should not accept empty query parameters', async () => {
    await request(app).get('/teams').expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should not accept bad query parameters', async () => {
    await request(app).get('/teams?tournamentId=lol&locked=mdr').expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should return a not found teams', async () => {
    await request(app).get('/teams?tournamentId=random').expect(404, { error: Error.TournamentNotFound });
  });

  it('should return 200 with an array of teams', async () => {
    const { body } = await request(app).get('/teams?tournamentId=lol').expect(200);

    expect(body).to.have.lengthOf(2);
  });

  it('should return 200 with an array of locked teams', async () => {
    const { body } = await request(app).get('/teams?tournamentId=lol&locked=true').expect(200);

    expect(body).to.have.lengthOf(1);
  });
});
