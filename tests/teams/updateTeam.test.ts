import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, Tournament, User } from "../../src/types";
import { createFakeTeam, createFakeTournament } from "../utils";
import { generateToken } from '../../src/utils/users';
import { getCaptain } from '../../src/utils/teams';

describe('PUT /teams/current', () => {
  let tournament: Tournament;
  let captain: User;
  let team: Team;
  let captainToken: string;

  before(async () => {
    tournament = await createFakeTournament({ playersPerTeam: 2 });
    team = await createFakeTeam({ members: 2, tournament: tournament.id });

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  it('should error as the body is incorrect', async () => {
    await request(app)
      .put('/teams/current')
      .send({ fake: 'fake' })
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(400, { error: Error.InvalidTeamName });
  });

  it('should error as the token is missing', async () => {
    await request(app).put('/teams/current').send({ name: 'yolo' }).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .put('/teams/current')
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(teamOperations, 'updateTeam').throws('Unknown error');

    await request(app)
      .put('/teams/current')
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should update the team', async () => {
    const { body } = await request(app)
      .put('/teams/current')
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    const updatedTeam = await teamOperations.fetchTeam(team.id);

    expect(body.name).to.be.equal('yolo');
    expect(updatedTeam.name).to.be.equal('yolo');

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });

  it('should error the team name already exists', async () => {
    const otherTeam = await createFakeTeam({ tournament: tournament.id });
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .put('/teams/current')
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(409, { error: Error.TeamAlreadyExists });
  });
});
