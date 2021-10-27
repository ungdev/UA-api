import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, Team, User, UserType } from '../../../src/types';
import * as teamOperations from '../../../src/operations/team';
import * as discordOperations from '../../../src/utils/discord';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { getCaptain } from '../../../src/utils/teams';

describe('POST /admin/users/:userId/replace', () => {
  let team: Team;
  let user: User;
  let targetUser: User;
  let admin: User;
  let adminToken: string;

  let validBody: { replacingUserId: string };

  before(async () => {
    team = await createFakeTeam({ locked: true });
    user = getCaptain(team);
    targetUser = await createFakeUser({ paid: true });
    admin = await createFakeUser({ permission: Permission.admin });
    adminToken = generateToken(admin);

    validBody = { replacingUserId: targetUser.id };
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/users/${user.id}/replace`).send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the body is invalid', () =>
    request(app)
      .post(`/admin/users/${user.id}/replace`)
      .send({ replacingUserId: 'lol' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400, { error: Error.InvalidUsername }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .post(`/admin/users/${user.id}/replace`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(validBody)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not found', () =>
    request(app)
      .post('/admin/users/A12B3C/replace')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(404, { error: Error.UserNotFound }));

  it('should error as the target user is not found', () =>
    request(app)
      .post(`/admin/users/${user.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ replacingUserId: 'A12B3C' })
      .expect(404, { error: Error.UserNotFound }));

  it('should error as the user is not in a team', () =>
    request(app)
      .post(`/admin/users/${targetUser.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ replacingUserId: targetUser.id })
      .expect(403, { error: Error.NotInTeam }));

  it('should error as the target user is already in a team', () =>
    request(app)
      .post(`/admin/users/${user.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ replacingUserId: user.id })
      .expect(403, { error: Error.AlreadyInTeam }));

  it('should error as the team is not locked', async () => {
    const notLockedTeam = await createFakeTeam();
    const notLockedUser = getCaptain(notLockedTeam);

    return request(app)
      .post(`/admin/users/${notLockedUser.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(403, { error: Error.TeamNotLocked });
  });

  it('should error as the users are not the same type', async () => {
    const coach = await createFakeUser({ type: UserType.coach });

    return request(app)
      .post(`/admin/users/${user.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ replacingUserId: coach.id })
      .expect(403, { error: Error.NotSameType });
  });

  it('should error as the target user has not paid', async () => {
    const notPaidUser = await createFakeUser();

    return request(app)
      .post(`/admin/users/${user.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ replacingUserId: notPaidUser.id })
      .expect(403, { error: Error.NotPaid });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(teamOperations, 'replaceUser').throws('Unexpected error');

    await request(app)
      .post(`/admin/users/${user.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should replace the user', async () => {
    sandbox.stub(discordOperations, 'removeDiscordRoles').returns(null);

    const { body } = await request(app)
      .post(`/admin/users/${user.id}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(200);

    const updatedTeam = await teamOperations.fetchTeam(team.id);

    expect(body.replacedUser.id).to.be.equal(user.id);
    expect(body.replacedUser.teamId).to.be.null;
    expect(body.replacedUser.type).to.be.null;

    expect(body.replacingUser.id).to.be.equal(targetUser.id);
    expect(body.replacingUser.teamId).to.be.equal(team.id);
    expect(body.replacingUser.type).to.be.equal(user.type);

    expect(updatedTeam.captainId).to.be.equal(body.replacingUser.id);
  });
});
