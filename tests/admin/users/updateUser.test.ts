import { expect } from 'chai';
import request from 'supertest';
import nock from 'nock';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser, generateFakeDiscordId } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { forcePay } from '../../../src/operations/carts';
import { DiscordGuildMember } from '../../../src/controllers/discord/discordApi';
import env from '../../../src/utils/env';

describe('PATCH /admin/users/:userId', () => {
  let user: User;
  let admin: User;
  let adminToken: string;
  const discordRoles: string[] = [];
  const discordIdFromAccountThatLeftServer = generateFakeDiscordId();

  const validBody: {
    type: string;
    place: string;
    permissions: Permission[];
  } = {
    type: UserType.player,
    place: 'A23',
    permissions: [],
  };

  before(async () => {
    user = await createFakeUser();
    admin = await createFakeUser({ permission: Permission.admin });
    adminToken = generateToken(admin);

    let rateLimitRemain = 5;

    env.discord.token = 'test-token';
    env.discord.server = generateFakeDiscordId();

    nock('https://discord.com/api/v9')
      .persist()
      .get(/\/guilds\/\d+\/members\/\d+/)
      .reply((uri) => {
        const discordMemberId = uri.match(/\d+$/)[0];
        const rateLimitHeader = {
          'X-RateLimit-Limit': 5,
          'X-RateLimit-Remaining': rateLimitRemain < 0 ? (rateLimitRemain = 5) : rateLimitRemain--,
          'x-Ratelimit-Reset-After': 0,
        } as unknown as nock.ReplyHeaders;
        return discordMemberId === discordIdFromAccountThatLeftServer
          ? [
              404,
              {
                code: 10007,
                message: 'Unknown member',
              },
              rateLimitHeader,
            ]
          : [
              200,
              <DiscordGuildMember>{
                avatar: '',
                deaf: false,
                is_pending: false,
                mute: false,
                pending: false,
                premium_since: '',
                roles: discordRoles,
                user: {
                  id: discordMemberId,
                  username: '',
                  avatar: '',
                  discriminator: '',
                  public_flags: 0,
                },
              },
              rateLimitHeader,
            ];
      })
      .delete(/\/guilds\/\d+\/members\/\d+\/roles\/\d+/)
      .reply(() => {
        const rateLimitHeader = {
          'X-RateLimit-Limit': 5,
          'X-RateLimit-Remaining': rateLimitRemain < 0 ? (rateLimitRemain = 5) : rateLimitRemain--,
          'x-Ratelimit-Reset-After': 0,
        } as unknown as nock.ReplyHeaders;
        return [204, null, rateLimitHeader];
      });
  });

  after(async () => {
    nock.cleanAll();
    delete env.discord.token;
    delete env.discord.server;
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/users/${user.id}`).send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the body is invalid', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .send({ ...validBody, permissions: ['bonjour'] })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400, { error: Error.NoPermission }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not found', () =>
    request(app)
      .patch('/admin/users/A12B3C')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(404, { error: Error.UserNotFound }));

  it('should throw an internal server error', () => {
    // Fake the main function to throw
    sandbox.stub(userOperations, 'updateAdminUser').throws('Unexpected error');

    // Request to login
    return request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should update the user', async () => {
    const team = await createFakeTeam();
    const teamMember = team.players[0];

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(200);

    const updatedUser = await userOperations.fetchUser(teamMember.id);

    expect(body.type).to.be.equal(validBody.type);
    expect(body.place).to.be.equal(validBody.place);
    expect(body.teamId).to.be.equal(team.id);

    expect(body.type).to.be.equal(updatedUser.type);
    expect(body.place).to.be.equal(updatedUser.place);
    expect(body.teamId).to.be.equal(updatedUser.teamId);
  });

  it('should update the user and remove him from his team', async () => {
    const team = await createFakeTeam({ members: 2, locked: true });
    const tournamentDiscordRoleId = generateFakeDiscordId();
    await database.tournament.update({
      where: {
        id: team.tournamentId,
      },
      data: {
        discordRoleId: tournamentDiscordRoleId,
      },
    });
    const teamMember = team.players.find((member) => member.id !== team.captainId);
    discordRoles.push(team.discordRoleId, tournamentDiscordRoleId);

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: UserType.spectator,
      })
      .expect(200);

    const updatedUser = await userOperations.fetchUser(teamMember.id);

    expect(body.type).to.be.equal(UserType.spectator);
    expect(body.type).to.be.equal(updatedUser.type);
    expect(body.teamId).to.be.equal(updatedUser.teamId);
  });

  it('should work if body is incomplete', async () => {
    const { body } = await request(app)
      .patch(`/admin/users/${user.id}`)
      .send({
        type: UserType.coach,
        permissions: [],
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.type).to.be.equal(UserType.coach);
  });

  it('should be able to update discordId only (no team)', async () => {
    const { body } = await request(app)
      .patch(`/admin/users/${user.id}`)
      .send({
        discordId: '627536251278278',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal('627536251278278');
  });

  it('should be able to update discordId only (team locked)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true });
    // tournament id has already been given
    const [teamMember] = team.players;
    discordRoles.push(team.discordRoleId);

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: '1111111111111111',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal('1111111111111111');
  });

  it('should be able to update discordId only (team locked, left discord server)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true });
    // tournament id has already been given
    const [teamMember] = team.players;
    await userOperations.updateAdminUser(teamMember.id, {
      discordId: discordIdFromAccountThatLeftServer,
    });
    discordRoles.push(team.discordRoleId);

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: '6253625367268999',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal('6253625367268999');
  });

  it('should be able to update discordId only (team not locked)', async () => {
    const team = await createFakeTeam({ members: 1 });
    // tournament id has already been given
    const [teamMember] = team.players;

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: '14261728925819152',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal('14261728925819152');
  });

  it('should be able to update customMessage only', async () => {
    const { body } = await request(app)
      .patch(`/admin/users/${user.id}`)
      .send({
        customMessage: 'Autorisation parentale',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.customMessage).to.be.equal('Autorisation parentale');
  });

  it('should fail as the place is already attributed', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ place: validBody.place })
      .expect(409, { error: Error.PlaceAlreadyAttributed }));

  it('should fail as the user has already paid and wants to change its type', async () => {
    user = await userOperations.fetchUser(user.id);
    await forcePay(user);
    return request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: user.type === UserType.player ? UserType.coach : UserType.player })
      .expect(403, { error: Error.CannotChangeType });
  });
});
