import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/user';
import { getCaptain } from '../../src/utils/teams';

describe.skip('POST /teams/:teamId/lock', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;

  before(async () => {
    team = await createFakeTeam(5);

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it("should error as the team id doesn't exists", async () => {
    await request(app)
      .post('/teams/A1B2C3/lock')
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(404, { error: Error.TeamNotFound });
  });

  it('should error as the token is missing', async () => {
    await request(app).post(`/teams/${team.id}/lock`).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the request is not logged as the captain of his team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should error as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should error as the team is not full', async () => {
    const halfTeam = await createFakeTeam(2);
    const halfCaptain = getCaptain(halfTeam);
    const halfToken = generateToken(halfCaptain);

    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${halfToken}`)
      .expect(409, { error: Error.TeamNotFound });
  });

  it('should error has the tournament is full', async () => {
    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(409, { error: Error.TournamentFull });
  });

  it('should error some member has not paid', async () => {
    const notPaidTeam = await createFakeTeam(5);
    const captain = getCaptain(notPaidTeam);
    const token = generateToken(captain);

    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(402, { error: Error.TeamNotPaid });
  });

  it('should throw an internal server error', async () => {
    // sandbox.stub(teamOperations, 'lockTeam').throws('Unknown error');

    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.Unknown });
  });

  it('should lock the team', async () => {
    const response = await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    const updatedTeam = await teamOperations.fetchTeam(team.id);
    expect(updatedTeam.lockedAt).to.be.not.null;
    expect(response.body.lockedAt).to.be.not.null;
  });

  it('should error as the team is already locked', async () => {
    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(409, Error.TeamLocked);
  });

  it('should error has the tournament is full', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    // We limit the tournament to only one team (as only one has locked)
    await database.tournament.update({
      data: {
        maxPlayers: 5,
      },
      where: {
        id: 'lol',
      },
    });

    await request(app)
      .post(`/teams/${team.id}/lock`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(409, { error: Error.TournamentFull });
  });
});
