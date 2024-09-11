import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamsOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Tournament } from '../../src/types';
import { createFakeTeam, createFakeTournament } from '../utils';

describe('GET /teams', () => {
  let tournament: Tournament;

  before(async () => {
    tournament = await createFakeTournament();
    await createFakeTeam({ tournament: tournament.id });
    await createFakeTeam({ locked: true, tournament: tournament.id });
  });

  after(async () => {
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamsOperations, 'fetchTeams').throws('Unexpected error');

    await request(app).get(`/teams?tournamentId=${tournament.id}`).expect(500, { error: Error.InternalServerError });
  });

  it('should not accept empty query parameters', async () => {
    await request(app).get('/teams').expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should not accept bad query parameters', async () => {
    await request(app)
      .get(`/teams?tournamentId=${tournament.id}&locked=mdr`)
      .expect(400, { error: Error.InvalidQueryParameters });
  });

  it('should return a 404 because the tournament does not exist', async () => {
    await request(app).get(`/teams?tournamentId=not-found-hehe`).expect(404, { error: Error.TournamentNotFound });
  });

  it('should return 200 with an array of teams', async () => {
    const { body } = await request(app).get(`/teams?tournamentId=${tournament.id}`).expect(200);

    expect(body).to.have.lengthOf(2);
  });

  it('should return 200 with an array of locked teams', async () => {
    const { body } = await request(app).get(`/teams?tournamentId=${tournament.id}&locked=true`).expect(200);

    expect(body).to.have.lengthOf(1);

    // Check if the object was filtered
    expect(body[0].updatedAt).to.be.undefined;
  });
});
