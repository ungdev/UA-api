import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';

describe('POST /teams', () => {
  let user: User;
  let token: string;

  let lolMaxPlayers: number;

  const teamBody = {
    name: 'ZeBest',
    tournamentId: 'lol',
  };

  before(async () => {
    user = await createFakeUser();
    token = generateToken(user);

    const lol = await tournamentOperations.fetchTournament('lol');
    lolMaxPlayers = lol.maxPlayers;
  });

  after(async () => {
    await database.log.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();

    await database.tournament.update({ data: { maxPlayers: lolMaxPlayers }, where: { id: 'lol' } });
  });

  it('should fail because the token is not provided', async () => {
    await request(app).post('/teams').expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is already in a team', async () => {
    const team = await createFakeTeam();
    const [localUser] = team.players;

    const localToken = generateToken(localUser);

    await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${localToken}`)
      .expect(403, { error: Error.AlreadyInTeam });
  });

  it('should fail because the body is incorrect', async () => {
    await request(app)
      .post('/teams')
      .send({ name: teamBody.name })
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidBody });
  });

  it("should fail because the tournament doesn't exists", async () => {
    await request(app)
      .post('/teams')
      .send({ name: teamBody.name, tournamentId: 'factorio' })
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidBody });
  });

  it('should fail with an internal server error (test nested check)', async () => {
    sandbox.stub(teamOperations, 'createTeam').throws('Unexpected error');
    await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail with an internal server error (test base catch)', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournament').throws('Unexpected error');
    await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should succesfully create a team', async () => {
    const response = await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(response.body.name).to.be.equal(teamBody.name);
    expect(response.body.tournamentId).to.be.equal(teamBody.tournamentId);
    expect(response.body.captainId).to.be.equal(user.id);
  });

  it('fail to create a team as it already exists in the tournament', async () => {
    const newUser = await createFakeUser();
    const newToken = generateToken(newUser);

    await request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${newToken}`)
      .expect(409, { error: Error.TeamAlreadyExists });
  });

  it('should success to create a team with the same name but in a different tournament', async () => {
    const newUser = await createFakeUser();
    const newToken = generateToken(newUser);

    const { body } = await request(app)
      .post('/teams')
      .send({ name: teamBody.name, tournamentId: 'csgo' })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(201);

    expect(body.name).to.be.equal(teamBody.name);
    expect(body.tournamentId).to.be.equal('csgo');
    expect(body.captainId).to.be.equal(newUser.id);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });

  it('should error as the tournament is full', async () => {
    await createFakeTeam({ members: 5, locked: true });
    const otherUser = await createFakeUser();
    const otherToken = generateToken(otherUser);

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
      .post('/teams')
      .send({ name: 'otherName', tournamentId: teamBody.tournamentId })
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(410, { error: Error.TournamentFull });
  });
});
