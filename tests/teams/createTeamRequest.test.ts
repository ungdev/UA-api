import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeConfirmedUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/user';

describe('POST /teams/:teamId/joinRequests', () => {
  let user: User;
  let token: string;
  let team: Team;

  const teamBody = {
    name: 'ZeBest',
    tournamentId: 'lol',
  };

  before(async () => {
    team = await createFakeTeam();
    user = await createFakeConfirmedUser();
    token = generateToken(user);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the team does not exists', async () => {
    await request(app).post(`/teams/1A2B3C/joinRequests`).expect(404, { error: Error.TeamNotFound });
  });

  it('should fail because the token is not provided', async () => {
    await request(app).post(`/teams/${team.id}/joinRequests`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is already in a team', async () => {
    const otherTeam = await createFakeTeam();
    const [localUser] = otherTeam.users;

    const localToken = generateToken(localUser);

    await request(app)
      .post(`/teams/${team.id}/joinRequests`)
      .send(teamBody)
      .set('Authorization', `Bearer ${localToken}`)
      .expect(409, { error: Error.AlreadyInTeam });
  });

  it("should fail because the tournament doesn't exists", async () => {
    await request(app)
      .post('/teams')
      .send({ name: teamBody.name, tournamentId: 'factorio' })
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TournamentNotFound });
  });

  it.skip('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournament').throws('Unexpected error');
    await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.Unknown });
  });

  it('should succesfully request to join a team', async () => {
    const response = await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(response.body.name).to.be.equal(teamBody.name);
    expect(response.body.tournamentId).to.be.equal(teamBody.tournamentId);
    expect(response.body.captainId).to.be.equal(user.id);
  });

  it('should fail as we already requested for a team', async () => {
    const newUser = await createFakeConfirmedUser();
    const newToken = generateToken(newUser);

    await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${newToken}`)
      .expect(409, { error: Error.TeamAlreadyExists });
  });

  it('should success to create a team with the same name but in a different tournament', async () => {
    const newUser = await createFakeConfirmedUser();
    const newToken = generateToken(newUser);

    const response = await request(app)
      .post('/teams')
      .send({ name: teamBody.name, tournamentId: 'csgo' })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(201);

    expect(response.body.name).to.be.equal(teamBody.name);
    expect(response.body.tournamentId).to.be.equal('csgo');
    expect(response.body.captainId).to.be.equal(newUser.id);
  });
});
