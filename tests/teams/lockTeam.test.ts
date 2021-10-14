import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { getCaptain } from '../../src/utils/teams';
import { fetchTournament } from '../../src/operations/tournament';
import { UserType } from '.prisma/client';

describe('POST /teams/current/lock', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;

  let lolMaxPlayers: number;

  before(async () => {
    team = await createFakeTeam({ members: 5, paid: true });

    captain = getCaptain(team);
    captainToken = generateToken(captain);

    const lol = await fetchTournament('lolCompetitive');
    lolMaxPlayers = lol.maxPlayers;
  });

  after(async () => {
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();

    await database.tournament.update({ data: { maxPlayers: lolMaxPlayers }, where: { id: 'lolCompetitive' } });
  });

  it('should error as the token is missing', () =>
    request(app).post('/teams/current/lock').expect(401, { error: Error.Unauthenticated }));

  it('should error as the team is not full', async () => {
    const halfTeam = await createFakeTeam({ members: 2 });
    const halfCaptain = getCaptain(halfTeam);
    const halfToken = generateToken(halfCaptain);

    return request(app)
      .post('/teams/current/lock')
      .set('Authorization', `Bearer ${halfToken}`)
      .expect(403, { error: Error.TeamNotFull });
  });

  it('should error if some member has not paid', async () => {
    const notPaidTeam = await createFakeTeam({ members: 5 });
    const notPaidCaptain = getCaptain(notPaidTeam);
    const notPaidToken = generateToken(notPaidCaptain);

    return request(app)
      .post('/teams/current/lock')
      .set('Authorization', `Bearer ${notPaidToken}`)
      .expect(403, { error: Error.TeamNotPaid });
  });

  it('should error if some coach has not paid', async () => {
    const notFullyPaidTeam = await createFakeTeam({ members: 5, paid: true });
    const notPaidCoach = await createFakeUser();
    await teamOperations.joinTeam(notFullyPaidTeam.id, notPaidCoach, UserType.coach);
    const paidCaptain = getCaptain(notFullyPaidTeam);
    const paidCaptainToken = generateToken(paidCaptain);

    return request(app)
      .post('/teams/current/lock')
      .set('Authorization', `Bearer ${paidCaptainToken}`)
      .expect(403, { error: Error.TeamNotPaid });
  });

  it('should throw an internal server error', () => {
    sandbox.stub(teamOperations, 'lockTeam').throws('Unknown error');

    return request(app)
      .post('/teams/current/lock')
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should lock the team', async () => {
    const { body } = await request(app)
      .post('/teams/current/lock')
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    const updatedTeam = await teamOperations.fetchTeam(team.id);
    expect(updatedTeam.lockedAt).to.be.not.null;
    expect(body.lockedAt).to.be.not.null;
    expect(body.askingUsers).to.have.lengthOf(0);

    // Check if the object was filtered
    return expect(body.updatedAt).to.be.undefined;
  });

  it('should error as the team is already locked', () =>
    request(app)
      .post('/teams/current/lock')
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(403, { error: Error.TeamLocked }));

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
        id: 'lolCompetitive',
      },
    });

    return request(app)
      .post('/teams/current/lock')
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(410, { error: Error.TournamentFull });
  });
});
