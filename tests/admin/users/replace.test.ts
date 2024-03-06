import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, Team, Tournament, User, UserType } from '../../../src/types';
import * as teamOperations from '../../../src/operations/team';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { getCaptain } from '../../../src/utils/teams';
import { registerMember, registerRole, resetFakeDiscord } from '../../discord';

describe('POST /admin/users/:userId/replace', () => {
  let tournament: Tournament;
  let team: Team;
  let user: User;
  let tournamentDiscordId: string;
  let targetUser: User;
  let admin: User;
  let adminToken: string;

  let validBody: { replacingUserId: string };

  before(async () => {
    tournament = await createFakeTournament({ playersPerTeam: 2, maxTeams: 1 });
    team = await createFakeTeam({ locked: true, tournament: tournament.id });
    registerRole(team.discordRoleId!);
    user = getCaptain(team);
    targetUser = await createFakeUser({ paid: true, type: UserType.player });
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);

    validBody = { replacingUserId: targetUser.id };

    tournamentDiscordId = (
      await database.tournament.update({
        where: {
          id: team.tournamentId,
        },
        data: {
          discordRoleId: registerRole(),
        },
      })
    ).discordRoleId!;

    registerMember(user.discordId!, [team.discordRoleId!, tournamentDiscordId]);
  });

  after(async () => {
    resetFakeDiscord();
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
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

  it('should error as the team is not locked (and is not in the waiting list)', async () => {
    const notLockedTeam = await createFakeTeam({ tournament: tournament.id });
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
    const notPaidUser = await createFakeUser({ type: UserType.player });

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
    const makeTest = async () => {
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
    };
    // Test with locked team
    await makeTest();

    // Reset
    await teamOperations.replaceUser(targetUser, user, team);
    await database.user.update({ where: { id: user.id }, data: { type: user.type } }); // user was not updated, so it still contains the old type
    await database.user.update({ where: { id: targetUser.id }, data: { type: user.type } }); // user was not updated, so it still contains the old type

    // Test with team in queue
    await database.team.update({ where: { id: team.id }, data: { lockedAt: null, enteredQueueAt: new Date() } });
    await makeTest();
  });
});
