import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as tournamentOperations from '../../src/operations/tournament';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';
import { Error, User, UserType } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';

describe('POST /teams', () => {
  let user: User;
  let token: string;

  let lolMaxPlayers: number;

  const teamBody = {
    name: 'ZeBest',
    tournamentId: 'lol',
    userType: UserType.player,
  };

  const teamBodyPokemon = {
    name: 'ZeBest2',
    tournamentId: 'pokemon',
    userType: UserType.player,
  };

  before(async () => {
    user = await createFakeUser({ type: UserType.player });
    token = generateToken(user);

    const lol = await tournamentOperations.fetchTournament('lol');
    lolMaxPlayers = lol.maxPlayers;
  });

  after(async () => {
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();

    await database.tournament.update({ data: { maxPlayers: lolMaxPlayers }, where: { id: 'lol' } });
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
      .expect(400, { error: '"tournamentId" is required' }));

  it("should fail because the tournament doesn't exists", () =>
    request(app)
      .post('/teams')
      .send({ ...teamBody, tournamentId: 'factorio' })
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TournamentNotFound }));

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

  it('should fail as the pokemonId is required for pokemon tournament', async () => {
    const pokemonUser = await createFakeUser({ type: UserType.player });
    const pokemonToken = generateToken(pokemonUser);

    return request(app)
      .post('/teams')
      .send({ ...teamBodyPokemon })
      .set('Authorization', `Bearer ${pokemonToken}`)
      .expect(400, { error: Error.NoPokemonIdProvided });
  });

  it('should fail as the pokemonId is not a number', async () => {
    const pokemonUser = await createFakeUser({ type: UserType.player });
    const pokemonToken = generateToken(pokemonUser);

    return request(app)
      .post('/teams')
      .send({ ...teamBodyPokemon, pokemonPlayerId: 'test' })
      .set('Authorization', `Bearer ${pokemonToken}`)
      .expect(400);
  });

  it('should successfully create a pokemon team', async () => {
    const pokemonUser = await createFakeUser({ type: UserType.player });
    const pokemonToken = generateToken(pokemonUser);

    return request(app)
      .post('/teams')
      .send({ ...teamBodyPokemon, pokemonPlayerId: '1' })
      .set('Authorization', `Bearer ${pokemonToken}`)
      .expect(201);
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
    const newUser = await createFakeUser({ type: UserType.player });
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
    const newUser = await createFakeUser({ type: UserType.player });
    const newToken = generateToken(newUser);

    return request(app)
      .post('/teams')
      .send(teamBody)
      .set('Authorization', `Bearer ${newToken}`)
      .expect(409, { error: Error.TeamAlreadyExists });
  });

  it('should success to create a team with the same name but in a different tournament', async () => {
    const newUser = await createFakeUser({ type: UserType.player });
    const newToken = generateToken(newUser);

    const { body } = await request(app)
      .post('/teams')
      .send({ ...teamBody, tournamentId: 'cs2' })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(201);

    expect(body.name).to.be.equal(teamBody.name);
    expect(body.tournamentId).to.be.equal('cs2');
    expect(body.captainId).to.be.equal(newUser.id);
    const remoteUser = await userOperations.fetchUser(body.captainId);
    expect(remoteUser.type).to.be.equal(teamBody.userType);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });

  it('should fail to create a team because user as already paid another ticket', async () => {
    const ssbuUser = await createFakeUser({ paid: true, type: UserType.player });
    const ssbuUserToken = generateToken(ssbuUser);

    return request(app)
      .post('/teams')
      .send({
        name: 'SSBU-SOLO-TEAM',
        tournamentId: 'ssbu',
        userType: UserType.player,
      })
      .set('Authorization', `Bearer ${ssbuUserToken}`)
      .expect(403, { error: Error.HasAlreadyPaidForAnotherTicket });
  });

  it('should fail to create a team because user as already paid another ticket type', async () => {
    const coach = await createFakeUser({ type: UserType.coach, paid: true });
    const coachToken = generateToken(coach);

    return request(app)
      .post('/teams')
      .send({
        name: 'lol-team',
        tournamentId: 'lol',
        userType: UserType.player,
      })
      .set('Authorization', `Bearer ${coachToken}`)
      .expect(403, { error: Error.HasAlreadyPaidForAnotherTicket });
  });

  it("should fail if captain hasn't chosen a type", async () => {
    const newUser = await createFakeUser({ type: UserType.player });
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
    const newUser = await createFakeUser({ type: UserType.player });
    const newToken = generateToken(newUser);
    await userOperations.updateAdminUser(newUser, { discordId: null });

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
    const osuPlayer = await createFakeUser({ type: UserType.player });
    const newToken = generateToken(osuPlayer);
    return request(app)
      .post('/teams')
      .send({
        ...teamBody,
        name: 'osuPlayer',
        tournamentId: 'osu',
      })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(403, { error: Error.NotWhitelisted });
  });

  it('should successfully lock the team (create solo team)', async () => {
    // Here, a user creates a team in a solo tournament (his team is therefore complete),
    // he has paid his ticket, so his team should be locked.
    // let's check it out

    // creation of a fake user who paid for his ticket
    const localUser = await createFakeUser({ paid: true, type: UserType.player, pricePaid: 2500 });
    const localUserToken = generateToken(localUser);

    // TFT : team of 1 person
    const localTeamBody = {
      name: 'Alone_1',
      tournamentId: 'tft',
      userType: UserType.player,
    };

    // Create the team
    await request(app).post('/teams').send(localTeamBody).set('Authorization', `Bearer ${localUserToken}`).expect(201);

    const databasedTeam = await database.team.findFirst({ where: { name: localTeamBody.name } });

    // Check if the team is lock
    expect(databasedTeam?.lockedAt).to.not.be.null;
  });

  it('should fail lock the team (create solo team but the user has not paid)', async () => {
    // Here, a user creates a team in a solo tournament (so his team is complete),
    // but he hasn't paid his ticket,
    // so his team shouldn't be locked.
    // let's check this out

    // creation of a fake user who has not paid for his ticket
    const localUser = await createFakeUser({ paid: false });
    const localUserToken = generateToken(localUser);

    // TFT : team of 1 person
    const localTeamBody = {
      name: 'AloneButNotPaid_1',
      tournamentId: 'tft',
      userType: UserType.player,
    };

    // Create the team
    await request(app).post('/teams').send(localTeamBody).set('Authorization', `Bearer ${localUserToken}`).expect(201);

    const databasedTeam = await database.team.findFirst({ where: { name: localTeamBody.name } });

    // Check if the team is not lock
    expect(databasedTeam?.lockedAt).to.be.null;
  });
});
