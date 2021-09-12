import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeUser, createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/users';
import { UserType } from '.prisma/client';

describe('POST /teams/:teamId/join-requests', () => {
  let user: User;
  let token: string;
  let team: Team;

  before(async () => {
    team = await createFakeTeam();
    user = await createFakeUser();
    token = generateToken(user);
  });

  after(async () => {
    await database.log.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail because the team does not exists', async () => {
    await request(app)
      .post(`/teams/1A2B3C/join-requests`)
      .send({ userType: UserType.player })
      .set('Authorization', `Bearer ${token}`)
      .expect(404, { error: Error.TeamNotFound });
  });

  it('should fail because the token is not provided', async () => {
    await request(app)
      .post(`/teams/${team.id}/join-requests`)
      .send({ userType: UserType.player })
      .expect(401, { error: Error.Unauthenticated });
  });

  it('should fail because the user is already in a team', async () => {
    const otherTeam = await createFakeTeam();
    const [localUser] = otherTeam.players;

    const localToken = generateToken(localUser);

    await request(app)
      .post(`/teams/${team.id}/join-requests`)
      .send({ userType: UserType.player })
      .set('Authorization', `Bearer ${localToken}`)
      .expect(403, { error: Error.AlreadyInTeam });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(teamOperations, 'askJoinTeam').throws('Unexpected error');
    await request(app)
      .post(`/teams/${team.id}/join-requests`)
      .send({ userType: UserType.player })
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should error as the team is locked', async () => {
    const lockedTeam = await createFakeTeam({ members: 5, locked: true });

    await request(app)
      .post(`/teams/${lockedTeam.id}/join-requests`)
      .send({ userType: UserType.player })
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.TeamLocked });
  });

  it('should not allow orga userType', async () => {
    await request(app)
      .post(`/teams/${team.id}/join-requests`)
      .send({ userType: UserType.orga })
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { error: Error.InvalidBody });
  });

  it('should succesfully request to join a team as a coach', async () => {
    const { body } = await request(app)
      .post(`/teams/${team.id}/join-requests`)
      .send({ userType: UserType.coach })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body.askingTeamId).to.be.equal(team.id);
    expect(body.type).to.be.equal(UserType.coach);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;

    // Delete request for next tests
    await teamOperations.deleteTeamRequest(user.id);
  });

  it('should succesfully request to join a team as a player', async () => {
    const { body } = await request(app)
      .post(`/teams/${team.id}/join-requests`)
      .send({ userType: UserType.player })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body.askingTeamId).to.be.equal(team.id);
    expect(body.type).to.be.equal(UserType.player);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });

  it('should fail as we already asked for the same team', async () => {
    await request(app)
      .post(`/teams/${team.id}/join-requests`)
      .send({ userType: UserType.player })
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.AlreadyAskedATeam });
  });

  it('should fail as we already asked another team', async () => {
    const otherTeam = await createFakeTeam();

    await request(app)
      .post(`/teams/${otherTeam.id}/join-requests`)
      .send({ userType: UserType.player })
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.AlreadyAskedATeam });
  });
});
