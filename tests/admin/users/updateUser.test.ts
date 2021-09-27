import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { forcePay } from '../../../src/operations/carts';
import { UserType } from '.prisma/client';

describe('PATCH /admin/users/:userId', () => {
  let user: User;
  let admin: User;
  let adminToken: string;

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
  });

  after(async () => {
    // Delete the user created
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.log.deleteMany();
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
    const team = await createFakeTeam({ members: 2 });
    const teamMember = team.players.find((member) => member.id !== team.captainId);

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

  it('should be able to update discordId only', async () => {
    const { body } = await request(app)
      .patch(`/admin/users/${user.id}`)
      .send({
        discordId: '627536251278278',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.discordId).to.be.equal('627536251278278');
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
