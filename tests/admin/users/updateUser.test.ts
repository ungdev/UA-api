import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { forcePay } from '../../../src/operations/carts';
import { deleteRole, kickMember, registerMember, registerRole, resetFakeDiscord } from '../../discord';

describe('PATCH /admin/users/:userId', () => {
  let user: User;
  let admin: User;
  let adminToken: string;
  let tournamentDiscordId: string;

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
    registerMember(user.discordId);
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    resetFakeDiscord();
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
      .expect(400, { error: Error.InvalidPermission }));

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
    registerRole(team.discordRoleId);

    tournamentDiscordId = registerRole();

    await database.tournament.update({
      where: {
        id: team.tournamentId,
      },
      data: {
        discordRoleId: tournamentDiscordId,
      },
    });
    const teamMember = team.players.find((member) => member.id !== team.captainId);
    registerMember(teamMember.discordId, [team.discordRoleId, tournamentDiscordId]);

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
    const fakeGuildMemberId = registerMember();
    const { body } = await request(app)
      .patch(`/admin/users/${user.id}`)
      .send({
        discordId: fakeGuildMemberId,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal(fakeGuildMemberId);
    kickMember(fakeGuildMemberId);
  });

  it('should be able to update discordId only (team locked)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true });
    // tournament id has already been given
    const [teamMember] = team.players;
    registerRole(team.discordRoleId);
    registerMember(teamMember.discordId, [team.discordRoleId, tournamentDiscordId]);

    const newAccount = registerMember();

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: newAccount,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal(newAccount);
    deleteRole(team.discordRoleId);
  });

  it('should be able to update discordId only (team locked, was not synced)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true });
    // tournament id has already been given
    const [teamMember] = team.players;
    registerRole(team.discordRoleId);
    registerMember(teamMember.discordId);

    const newAccount = registerMember();

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: newAccount,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal(newAccount);
    deleteRole(team.discordRoleId);
  });

  it('should be able to update discordId only (team locked, left discord server)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true });
    // tournament id has already been given
    const [teamMember] = team.players;
    kickMember(teamMember.discordId);
    registerRole(team.discordRoleId);

    const newDiscordId = registerMember();

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: newDiscordId,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal(newDiscordId);
  });

  it('should be able to update discordId only (team not locked)', async () => {
    const team = await createFakeTeam({ members: 1 });
    // tournament id has already been given
    const [teamMember] = team.players;
    registerMember(teamMember.id);
    const newDiscordId = registerMember();

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: newDiscordId,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal(newDiscordId);
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

  it('should remove all permissions from the user', async () => {
    const permissibleUser = await createFakeUser({ permissions: [Permission.stream] });

    const { body } = await request(app)
      .patch(`/admin/users/${permissibleUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permissions: [],
      })
      .expect(200);

    const updatedUser = await userOperations.fetchUser(permissibleUser.id);

    expect(body.permissions).to.have.lengthOf(0);
    expect(updatedUser.permissions).to.have.lengthOf(0);
    expect(body.discordId).to.be.equal(permissibleUser.discordId);
    expect(body.place).to.be.equal(permissibleUser.place);
    expect(body.type).to.be.equal(permissibleUser.type);
    expect(body.age).to.be.equal(permissibleUser.age);
    expect(body.customMessage).to.be.equal(permissibleUser.customMessage);
  });

  it('should add permissions to the user', async () => {
    const permissibleUser = await createFakeUser();

    const { body } = await request(app)
      .patch(`/admin/users/${permissibleUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permissions: [Permission.stream],
      })
      .expect(200);

    const updatedUser = await userOperations.fetchUser(permissibleUser.id);

    expect(body.permissions).to.include(Permission.stream);
    expect(updatedUser.permissions).to.include(Permission.stream);
    expect(body.discordId).to.be.equal(permissibleUser.discordId);
    expect(body.place).to.be.equal(permissibleUser.place);
    expect(body.type).to.be.equal(permissibleUser.type);
    expect(body.age).to.be.equal(permissibleUser.age);
    expect(body.customMessage).to.be.equal(permissibleUser.customMessage);
  });
});
