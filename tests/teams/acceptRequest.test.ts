import { UserType } from '@prisma/client';
import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';
import { fetchUser } from '../../src/operations/user';
import { getCaptain } from '../../src/utils/teams';

describe('POST /teams/current/join-requests/:userId', () => {
  let user: User;
  let team: Team;
  let captain: User;
  let token: string;

  before(async () => {
    team = await createFakeTeam({ members: 2 });
    user = await createFakeUser();
    await teamOperations.askJoinTeam(team.id, user.id, UserType.player);

    captain = getCaptain(team);
    token = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the token is not provided', async () => {
    await request(app).post(`/teams/current/join-requests/${user.id}`).expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is a random with no rights', async () => {
    const randomUser = await createFakeUser();
    const randomUserToken = generateToken(randomUser);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${randomUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should fail because the user is a member of the team but not the captain', async () => {
    const member = team.players.find((teamUsers) => teamUsers.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should fail as the user is the captain of another team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotAskedTeam });
  });

  it('should fail as the user does not exists', async () => {
    await request(app)
      .post(`/teams/current/join-requests/A12B3C`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'joinTeam').throws('Unexpected error');
    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should error as the team is locked', async () => {
    const lockedTeam = await createFakeTeam({ members: 5, locked: true });
    const lockedCaptain = getCaptain(lockedTeam);
    const lockedToken = generateToken(lockedCaptain);

    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${lockedToken}`)
      .expect(403, { error: Error.TeamLocked });
  });

  it('should fail as the team is full', async () => {
    const fullTeam = await createFakeTeam({ members: 5 });
    const otherUser = await createFakeUser();

    const fullCaptain = getCaptain(fullTeam);
    const fullToken = generateToken(fullCaptain);
    await teamOperations.askJoinTeam(fullTeam.id, otherUser.id, UserType.player);

    await request(app)
      .post(`/teams/current/join-requests/${otherUser.id}`)
      .set('Authorization', `Bearer ${fullToken}`)
      .expect(403, { error: Error.TeamFull });
  });

  it('should succeed to join a full team as a coach', async () => {
    const fullTeam = await createFakeTeam({ members: 5 });
    const otherUser = await createFakeUser();

    const fullCaptain = getCaptain(fullTeam);
    const fullToken = generateToken(fullCaptain);
    await teamOperations.askJoinTeam(fullTeam.id, otherUser.id, UserType.coach);

    await request(app)
      .post(`/teams/current/join-requests/${otherUser.id}`)
      .set('Authorization', `Bearer ${fullToken}`)
      .expect(200);
  });

  it('should succesfully join the team', async () => {
    const { body } = await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updatedUser = await fetchUser(user.id);

    expect(body.players).to.have.lengthOf(team.players.length + 1);
    expect(updatedUser.askingTeamId).to.be.null;

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });

  it('should fail because the user has not asked for a team', async () => {
    await request(app)
      .post(`/teams/current/join-requests/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.NotAskedTeam });
  });
});
