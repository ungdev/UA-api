import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as tournamentOperations from '../../src/operations/tournament';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';
import { Error, User, TournamentId, UserType } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';

describe('POST /teams', () => {
  let user: User;
  let token: string;

  let lolMaxPlayers: number;

  const teamBody = {
    name: 'ZeBest',
    tournamentId: 'lolCompetitive',
    userType: UserType.player,
  };

  before(async () => {
    user = await createFakeUser();
    token = generateToken(user);

    const lol = await tournamentOperations.fetchTournament('lolCompetitive');
    lolMaxPlayers = lol.maxPlayers;
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();

    await database.tournament.update({ data: { maxPlayers: lolMaxPlayers }, where: { id: 'lolCompetitive' } });
  });

  it('should fail because the token is not provided', () =>
    request(app).post('/teams').expect(401, { error: Error.Unauthenticated }));

  it('should fail because the user is already in a team', async () => {
    const team = await createFakeTeam();
    const [localUser] = team.players;

    const localToken = generateToken(localUser);

    return request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${localToken}`)
      .expect(403, { error: Error.AlreadyInTeam });
  });

  it('should fail because the user is a spectator', async () => {
    const spectator = await createFakeUser({ type: UserType.spectator });
    const spectatorToken = generateToken(spectator);

    return request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${spectatorToken}`)
      .expect(403, { error: Error.NoSpectator });
  });

  it('should fail because the body is incorrect', () =>
    request(app)
      .post('/teams')
      .send({ name: teamBody.name })
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: "Ce tournoi n'existe pas" }));

  it("should fail because the tournament doesn't exists", () =>
    request(app)
      .post('/teams')
      .send({ ...teamBody, tournamentId: 'factorio' })
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: "Ce tournoi n'existe pas" }));

  it('should fail with an internal server error (test nested check)', () => {
    sandbox.stub(teamOperations, 'createTeam').throws('Unexpected error');
    return request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail with an internal server error (test base catch)', () => {
    sandbox.stub(tournamentOperations, 'fetchTournament').throws('Unexpected error');
    return request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should successfully create a team (as a player)', async () => {
    const response = await request(app)
      .post('/teams')
      .send({
        ...teamBody,
        userType: UserType.player,
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(response.body.name).to.be.equal(teamBody.name);
    expect(response.body.tournamentId).to.be.equal(teamBody.tournamentId);
    expect(response.body.captainId).to.be.equal(user.id);
    const remoteUser = await userOperations.fetchUser(response.body.captainId);
    expect(remoteUser.type).to.be.equal(UserType.player);
  });

  it('should successfully create a team (as a coach)', async () => {
    const newUser = await createFakeUser();
    const newToken = generateToken(newUser);

    const response = await request(app)
      .post('/teams')
      .send({
        ...teamBody,
        name: 'GeoCoaching',
        userType: UserType.coach,
      })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(201);
    expect(response.body.name).to.be.equal('GeoCoaching');
    expect(response.body.tournamentId).to.be.equal(teamBody.tournamentId);
    expect(response.body.captainId).to.be.equal(newUser.id);
    const remoteUser = await userOperations.fetchUser(response.body.captainId);
    expect(remoteUser.type).to.be.equal(UserType.coach);
  });

  it('fail to create a team as it already exists in the tournament', async () => {
    const newUser = await createFakeUser();
    const newToken = generateToken(newUser);

    return request(app)
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
      .send({ ...teamBody, tournamentId: 'csgo' })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(201);

    expect(body.name).to.be.equal(teamBody.name);
    expect(body.tournamentId).to.be.equal('csgo');
    expect(body.captainId).to.be.equal(newUser.id);
    const remoteUser = await userOperations.fetchUser(body.captainId);
    expect(remoteUser.type).to.be.equal(teamBody.userType);

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
        id: 'lolCompetitive',
      },
    });

    return request(app)
      .post('/teams')
      .send({ name: 'otherName', tournamentId: teamBody.tournamentId, userType: teamBody.userType })
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(410, { error: Error.TournamentFull });
  });

  it('should deny orga captain type', async () => {
    const newUser = await createFakeUser();
    const newToken = generateToken(newUser);

    return request(app)
      .post('/teams')
      .send({
        ...teamBody,
        userType: UserType.orga,
      })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(400, { error: Error.InvalidUserType });
  });

  it("should fail if captain hasn't chosen a type", async () => {
    const newUser = await createFakeUser();
    const newToken = generateToken(newUser);

    return request(app)
      .post('/teams')
      .send({
        name: teamBody.name,
        tournamentId: teamBody.tournamentId,
      })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(400, { error: Error.InvalidUserType });
  });

  it('should fail because user has no linked discord account', async () => {
    const newUser = await createFakeUser();
    const newToken = generateToken(newUser);
    await userOperations.updateAdminUser(newUser.id, { discordId: null });

    return request(app)
      .post('/teams')
      .send({
        ...teamBody,
        name: 'NoDiscordAccount',
        tournamentId: 'rl',
      })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(403, { error: Error.NoDiscordAccountLinked });
  });

  it('should fail as the user is not whitelisted for osu!', async () => {
    const osuPlayer = await createFakeUser();
    const newToken = generateToken(osuPlayer);
    return request(app)
      .post('/teams')
      .send({
        ...teamBody,
        name: 'osuPlayer',
        tournamentId: TournamentId.osu,
      })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(403, { error: Error.NotWhitelisted });
  });
});
