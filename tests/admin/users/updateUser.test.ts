import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, Tournament, User, UserAge, UserPatchBody, UserType } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { forcePay } from '../../../src/operations/carts';
import { deleteRole, kickMember, registerMember, registerRole, resetFakeDiscord } from '../../discord';
import { fetchOrga } from '../../../src/operations/user';

describe('PATCH /admin/users/:userId', () => {
  let tournament: Tournament;
  let user: User;
  let adminToken: string;
  let anim: User;
  let animToken: string;
  let tournamentDiscordId: string;

  const validBody: UserPatchBody = {
    type: UserType.player,
    place: 'A23',
    permissions: [],
    age: UserAge.adult,
    customMessage: 'Checker autorisation parentale',
    email: 'user@example.com',
    firstname: 'Random',
    lastname: 'User',
    username: 'some-random-user',
    discordId: registerMember(),
  };

  const validAnimBody: UserPatchBody = {
    ...validBody,
    place: 'A67',
    email: 'user2@example.com',
    username: 'some-other-user',
    discordId: registerMember(),
  };

  before(async () => {
    tournament = await createFakeTournament();
    user = await createFakeUser({ type: UserType.player });
    registerMember(user.discordId!);
    const admin = await createFakeUser({ permissions: [Permission.admin, Permission.orga], type: UserType.player });
    adminToken = generateToken(admin);
    anim = await createFakeUser({ permissions: [Permission.anim, Permission.orga], type: UserType.player });
    animToken = generateToken(anim);
  });

  after(async () => {
    // Delete the user created
    resetFakeDiscord();
    await database.orgaRole.deleteMany();
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
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
    const team = await createFakeTeam({ tournament: tournament.id });
    const teamMember = team.players[0];

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(200);

    const updatedUser = await userOperations.fetchUser(teamMember.id);

    expect(body.data.type).to.be.equal(validBody.type);
    expect(body.data.place).to.be.equal(validBody.place);
    expect(body.data.permissions).to.have.same.members(validBody.permissions!);
    expect(body.data.age).to.be.equal(validBody.age);
    expect(body.customMessage).to.be.equal(validBody.customMessage);
    expect(body.data.email).to.be.equal(validBody.email);
    expect(body.data.firstname).to.be.equal(validBody.firstname);
    expect(body.data.lastname).to.be.equal(validBody.lastname);
    expect(body.data.username).to.be.equal(validBody.username);
    expect(body.data.discordId).to.be.equal(validBody.discordId);
    expect(body.data.teamId).to.be.equal(team.id);

    expect(body.data.type).to.be.equal(updatedUser.type);
    expect(body.data.place).to.be.equal(updatedUser.place);
    expect(body.data.teamId).to.be.equal(updatedUser.teamId);
    expect(body.data.permissions).to.have.same.members(updatedUser.permissions);
    expect(body.data.age).to.be.equal(updatedUser.age);
    expect(body.customMessage).to.be.equal(updatedUser.customMessage);
    expect(body.data.email).to.be.equal(updatedUser.email);
    expect(body.data.firstname).to.be.equal(updatedUser.firstname);
    expect(body.data.lastname).to.be.equal(updatedUser.lastname);
    expect(body.data.username).to.be.equal(updatedUser.username);
    expect(body.data.discordId).to.be.equal(updatedUser.discordId);
  });

  it('should update the user and remove him from his team', async () => {
    const team = await createFakeTeam({ members: 2, locked: true, tournament: tournament.id });
    registerRole(team.discordRoleId!);

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
    registerMember(teamMember!.discordId!, [team.discordRoleId!, tournamentDiscordId]);

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: UserType.spectator,
      })
      .expect(200);

    const updatedUser = await userOperations.fetchUser(teamMember!.id);

    expect(body.data.type).to.be.equal(UserType.spectator);
    expect(body.data.type).to.be.equal(updatedUser.type);
    expect(body.data.teamId).to.be.equal(updatedUser.teamId);
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

    expect(body.data.type).to.be.equal(UserType.coach);
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

    expect(body.data.discordId).to.be.equal(fakeGuildMemberId);
    kickMember(fakeGuildMemberId);
  });

  it('should be able to update discordId only (team locked)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true, tournament: tournament.id });
    // tournament id has already been given
    const [teamMember] = team.players;
    registerRole(team.discordRoleId!);
    registerMember(teamMember!.discordId!, [team.discordRoleId!, tournamentDiscordId]);

    const newAccount = registerMember();

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: newAccount,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.data.discordId).to.be.equal(newAccount);
    deleteRole(team.discordRoleId!);
  });

  it('should be able to update discordId only (team locked, was not synced)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true, tournament: tournament.id });
    // tournament id has already been given
    const [teamMember] = team.players;
    registerRole(team.discordRoleId!);
    registerMember(teamMember!.discordId!);

    const newAccount = registerMember();

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: newAccount,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.data.discordId).to.be.equal(newAccount);

    deleteRole(team.discordRoleId!);
  });

  it('should be able to update discordId only (team locked, left discord server)', async () => {
    const team = await createFakeTeam({ members: 1, locked: true, tournament: tournament.id });
    // tournament id has already been given
    const [teamMember] = team.players;
    kickMember(teamMember!.discordId!);
    registerRole(team.discordRoleId!);

    const newDiscordId = registerMember();

    const { body } = await request(app)
      .patch(`/admin/users/${teamMember.id}`)
      .send({
        discordId: newDiscordId,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.data.discordId).to.be.equal(newDiscordId);
  });

  it('should be able to update discordId only (team not locked)', async () => {
    const team = await createFakeTeam({ members: 1, tournament: tournament.id });
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

    expect(body.data.discordId).to.be.equal(newDiscordId);
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

  it('should fail as the username is already attributed', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: validBody.username })
      .expect(409, { error: Error.UsernameAlreadyExists }));

  it('should fail as the email is already attributed', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: validBody.email })
      .expect(409, { error: Error.EmailAlreadyExists }));

  it('should fail as the discordId is already attributed', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discordId: validBody.discordId })
      .expect(409, { error: Error.DiscordAccountAlreadyUsed }));

  it('should deny an anim to alter a user permissions', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${animToken}`)
      .send({
        ...validAnimBody,
        permissions: [],
      })
      .expect(403, { error: Error.NoPermission }));

  it('should return an error as the commission does not exist', () =>
    request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orgaRoles: [{ commissionRole: 'member', commission: 'random' }],
      })
      .expect(404, { error: Error.CommissionNotFound }));

  it('should allow an anim to alter a user', async () => {
    const randomUser = await createFakeUser({ type: UserType.player });
    delete validAnimBody.permissions;

    const { body } = await request(app)
      .patch(`/admin/users/${randomUser.id}`)
      .set('Authorization', `Bearer ${animToken}`)
      .send(validAnimBody)
      .expect(200);

    const updatedUser = await userOperations.fetchUser(randomUser.id);

    expect(body.data.type).to.be.equal(validAnimBody.type);
    expect(body.data.type).to.be.equal(updatedUser.type);
    expect(body.data.teamId).to.be.equal(updatedUser.teamId);
    expect(body.data.place).to.be.equal(validAnimBody.place);
    expect(body.data.age).to.be.equal(validAnimBody.age);
    expect(body.customMessage).to.be.equal(validAnimBody.customMessage);
    expect(body.data.email).to.be.equal(validAnimBody.email);
    expect(body.data.firstname).to.be.equal(validAnimBody.firstname);
    expect(body.data.lastname).to.be.equal(validAnimBody.lastname);
    expect(body.data.username).to.be.equal(validAnimBody.username);
    expect(body.data.discordId).to.be.equal(validAnimBody.discordId);
  });

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
    const permissibleUser = await createFakeUser({ permissions: [Permission.stream], type: UserType.player });

    const { body } = await request(app)
      .patch(`/admin/users/${permissibleUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permissions: [],
      })
      .expect(200);

    const updatedUser = await userOperations.fetchUser(permissibleUser.id);

    expect(body.data.permissions).to.have.lengthOf(0);
    expect(updatedUser.permissions).to.have.lengthOf(0);
    expect(body.data.discordId).to.be.equal(permissibleUser.discordId);
    expect(body.data.place).to.be.equal(permissibleUser.place);
    expect(body.data.type).to.be.equal(permissibleUser.type);
    expect(body.data.age).to.be.equal(permissibleUser.age);
    expect(body.customMessage).to.be.equal(permissibleUser.customMessage);
    expect(body.data.orga).to.be.null;
  });

  it('should add permissions to the user', async () => {
    const permissibleUser = await createFakeUser({ type: UserType.player });

    const { body } = await request(app)
      .patch(`/admin/users/${permissibleUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permissions: [Permission.stream],
      })
      .expect(200);

    const updatedUser = await userOperations.fetchUser(permissibleUser.id);

    expect(body.data.permissions).to.include(Permission.stream);
    expect(updatedUser.permissions).to.include(Permission.stream);
    expect(body.data.discordId).to.be.equal(permissibleUser.discordId);
    expect(body.data.place).to.be.equal(permissibleUser.place);
    expect(body.data.type).to.be.equal(permissibleUser.type);
    expect(body.data.age).to.be.equal(permissibleUser.age);
    expect(body.customMessage).to.be.equal(permissibleUser.customMessage);
  });

  it('should add 2 commissions to the anim orga', async () => {
    const { body } = await request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orgaRoles: [
          { commissionRole: 'member', commission: 'animation_ssbu' },
          { commissionRole: 'member', commission: 'animation_cs2' },
        ],
        orgaMainCommission: 'animation_ssbu',
      })
      .expect(200);
    expect(body.data.orga).to.not.be.null;
    const orga = await fetchOrga(anim);
    expect(orga.roles).to.have.length(2);
    expect(orga.mainCommissionId).to.be.equal('animation_ssbu');
  });

  it('should remove 1 commission to the anim orga, add 1 new commission and promote the orga in one commission', async () => {
    await request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orgaRoles: [
          { commissionRole: 'respo', commission: 'animation_ssbu' },
          { commissionRole: 'member', commission: 'animation_lol' },
        ],
      })
      .expect(200);
    const orga = await fetchOrga(anim);
    expect(orga.roles).to.have.length(2);
    expect(orga.roles[0].commission.id).to.be.equal('animation_lol');
    expect(orga.roles[0].commissionRole).to.be.equal('member');
    expect(orga.roles[1].commission.id).to.be.equal('animation_ssbu');
    expect(orga.roles[1].commissionRole).to.be.equal('respo');
  });

  it('should fail as the main commission we are trying to set is not a commission of the orga', async () => {
    await request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orgaMainCommission: 'coord' })
      .expect(403, { error: Error.MainCommissionMustBeInList });
  });

  it('should fail as we are trying to set the main commission to a commission we are removing', async () => {
    await request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orgaMainCommission: 'animation_ssbu', orgaRoles: [] })
      .expect(403, { error: Error.MainCommissionMustBeInList });
  });

  it('should set the main commission to the orga', async () => {
    await request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orgaMainCommission: 'animation_ssbu' })
      .expect(200);
    const orga = await fetchOrga(anim);
    expect(orga.mainCommission.id).to.be.equal('animation_ssbu');
  });

  it('should fail as we are trying to remove a commission to the orga, and that commission is his main one', () =>
    request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orgaRoles: [] })
      .expect(403, { error: Error.MainCommissionMustBeInList }));

  it('should change the main commission of the orga and remove the old one from the list of commissions', () =>
    request(app)
      .patch(`/admin/users/${anim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orgaRoles: [{ commissionRole: 'respo', commission: 'animation_lol' }],
        orgaMainCommission: 'animation_lol',
      })
      .expect(200));

  it('should fail to add a commission to the user as the user is not an organizer', () =>
    request(app)
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orgaRoles: [{ commissionRole: 'respo', commission: 'animation_lol' }] })
      .expect(403, { error: Error.IsNotOrga }));
});
