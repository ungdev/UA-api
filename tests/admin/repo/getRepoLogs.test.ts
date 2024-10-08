import { RepoLogAction } from '@prisma/client';
import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import * as repoOperations from '../../../src/operations/repo';
import { lockTeam } from '../../../src/operations/team';
import { scanUser } from '../../../src/operations/user';
import database from '../../../src/services/database';
import { Error, Permission, Team, User, UserType } from '../../../src/types';
import { getCaptain } from '../../../src/utils/teams';
import { generateToken } from '../../../src/utils/users';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../../utils';
import { sandbox } from '../../setup';

describe('GET /admin/repo/user/:userId/logs', () => {
  let admin: User;
  let adminToken: string;
  let nonAdmin: User;
  let nonAdminToken: string;
  let team: Team;
  let captain: User;

  before(async () => {
    const tournament = await createFakeTournament();
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);
    nonAdmin = await createFakeUser({ type: UserType.player });
    nonAdminToken = generateToken(nonAdmin);
    team = await createFakeTeam({ tournament: tournament.id });
    captain = getCaptain(team);
  });

  after(async () => {
    await database.repoLog.deleteMany();
    await database.repoItem.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  it('should fail as user is not authenticated', async () => {
    await request(app).get(`/admin/repo/user/${nonAdmin.id}/logs`).expect(401, { error: Error.Unauthenticated });
  });

  it("should fail as user isn't an admin", async () => {
    await request(app)
      .get(`/admin/repo/user/${nonAdmin.id}/logs`)
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it("should fail as user doesn't exist", async () => {
    await request(app)
      .get('/admin/repo/user/ABCDEF/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail as user has not been scanned', async () => {
    await request(app)
      .get(`/admin/repo/user/${captain.id}/logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as user doesn't have a team", async () => {
    await scanUser(nonAdmin.id);
    await request(app)
      .get(`/admin/repo/user/${nonAdmin.id}/logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as team isn't locked", async () => {
    await scanUser(captain.id);
    await request(app)
      .get(`/admin/repo/user/${captain.id}/logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it('should successfully return a list of logs', async () => {
    await lockTeam(team.id);
    await database.$transaction(repoOperations.addRepoItem(captain.id, 'computer', 'Zone 1'));
    await database.$transaction(repoOperations.addRepoItem(captain.id, 'computer', 'Zone 2'));
    const response = await request(app)
      .get(`/admin/repo/user/${captain.id}/logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // Verify the first item added
    expect(response.body.logs).to.have.length(2);
    expect(response.body.logs[1].itemType).to.be.equal('computer');
    expect(response.body.logs[1].action).to.be.equal(RepoLogAction.added);
    // We can't check the exact date, so we simply verify that the timestamp is the right one at +/- 3 seconds
    expect(Date.now() - Date.parse(response.body.logs[0].timestamp)).to.be.lessThanOrEqual(3000);
    expect(response.body.logs[1].agent?.firstname).to.be.equal(captain.firstname);
    expect(response.body.logs[1].agent?.lastname).to.be.equal(captain.lastname);
    expect(response.body.logs[1].zone).to.be.equal('Zone 1');
    // Verify the second item added
    expect(response.body.logs[0].zone).to.be.equal('Zone 2');
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(repoOperations, 'fetchRepoLogs').throws('Unexpected error');
    await request(app)
      .get(`/admin/repo/user/${captain.id}/logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as user is a spectator', async () => {
    await database.user.update({ where: { id: nonAdmin.id }, data: { type: 'spectator' } });
    return request(app)
      .get(`/admin/repo/user/${nonAdmin.id}/logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.OnlyPlayersAllowed });
  });
});
