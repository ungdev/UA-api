import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, Tournament, User, UserType } from '../../src/types';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { getCaptain } from '../../src/utils/teams';

describe('PUT /teams/current/captain/:userId', () => {
  let tournament: Tournament;
  let captain: User;
  let team: Team;
  let captainToken: string;

  let futureCaptain: User;

  before(async () => {
    tournament = await createFakeTournament({ playersPerTeam: 2, coachesPerTeam: 1 });
    team = await createFakeTeam({ members: 2, tournament: tournament.id });

    captain = getCaptain(team);
    captainToken = generateToken(captain);

    futureCaptain = team.players.find((player) => player.id !== team.captainId);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  it('should error as the token is missing', async () => {
    await request(app).put(`/teams/current/captain/${futureCaptain.id}`).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the user is unknown', async () => {
    await request(app)
      .put(`/teams/current/captain/A12B3C`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should error as the user is in another team', async () => {
    const otherTeam = await createFakeTeam({ members: 2, tournament: tournament.id });
    const otherMember = otherTeam.players.find((player) => player.id !== otherTeam.captainId);

    await request(app)
      .put(`/teams/current/captain/${otherMember.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should error as the request is logged as the member of the team', async () => {
    const memberToken = generateToken(futureCaptain);

    await request(app)
      .put(`/teams/current/captain/${futureCaptain.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(teamOperations, 'promoteUser').throws('Unknown error');

    await request(app)
      .put(`/teams/current/captain/${futureCaptain.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should promote the new captain', async () => {
    const { body } = await request(app)
      .put(`/teams/current/captain/${futureCaptain.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    const updatedTeam = await teamOperations.fetchTeam(team.id);

    expect(body.captainId).to.be.equal(futureCaptain.id);
    expect(updatedTeam.captainId).to.be.equal(futureCaptain.id);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });

  it('should not promote as he is already a captain', async () => {
    await request(app)
      .put(`/teams/current/captain/${futureCaptain.id}`)
      .set('Authorization', `Bearer ${generateToken(futureCaptain)}`)
      .expect(403, { error: Error.AlreadyCaptain });
  });

  it('should error as the old captain is trying to promote someone', async () => {
    await request(app)
      .put(`/teams/current/captain/${futureCaptain.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should promote be able to promote a coach', async () => {
    const coach = await createFakeUser({ type: UserType.coach });
    await teamOperations.joinTeam(team.id, coach);

    const { body } = await request(app)
      .put(`/teams/current/captain/${coach.id}`)
      .set('Authorization', `Bearer ${generateToken(futureCaptain)}`)
      .expect(200);

    const updatedTeam = await teamOperations.fetchTeam(team.id);

    expect(body.captainId).to.be.equal(coach.id);
    expect(updatedTeam.captainId).to.be.equal(coach.id);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });
});
