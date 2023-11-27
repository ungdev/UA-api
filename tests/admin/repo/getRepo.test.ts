import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { createFakeUser, createFakeTeam } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User, Team, UserType } from '../../../src/types';
import * as userUtils from '../../../src/utils/users';
import * as teamUtils from '../../../src/utils/teams';
import { encrypt } from '../../../src/utils/helpers';
import { scanUser } from '../../../src/operations/user';
import { lockTeam } from '../../../src/operations/team';

describe('GET /admin/repo/user', () => {
  let admin: User;
  let adminToken: string;
  let nonAdmin: User;
  let nonAdminToken: string;
  let team: Team;
  let captain: User;

  before(async () => {
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = userUtils.generateToken(admin);
    nonAdmin = await createFakeUser({ type: UserType.player });
    nonAdminToken = userUtils.generateToken(nonAdmin);
    team = await createFakeTeam();
    captain = teamUtils.getCaptain(team);
  });

  after(async () => {
    await database.repoLog.deleteMany();
    await database.repoItem.deleteMany();
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail as user is not authenticated', async () => {
    await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(nonAdmin.id).toString('base64'))}`)
      .expect(401, { error: Error.Unauthenticated });
  });

  it('should fail as user is not an admin', async () => {
    await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(nonAdmin.id).toString('base64'))}`)
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail as userId is not well encrypted', async () => {
    await request(app)
      .get(`/admin/repo/user?id=abcdef`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400, { error: Error.InvalidQRCode });
  });

  it('should fail as there are no user with id ABCDEF', async () => {
    await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt('ABCDEF').toString('base64'))}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail as user has not been scanned', async () => {
    await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(captain.id).toString('base64'))}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as user doesn't have a team", async () => {
    await scanUser(nonAdmin.id);
    await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(nonAdmin.id).toString('base64'))}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as team isn't locked", async () => {
    await scanUser(captain.id);
    await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(captain.id).toString('base64'))}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it('should successfully return an empty list of items for a player', async () => {
    await lockTeam(team.id);
    const response = await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(captain.id).toString('base64'))}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.firstname).to.be.equal(captain.firstname);
    expect(response.body.lastname).to.be.equal(captain.lastname);
    expect(response.body.place).to.be.equal(captain.place);
    expect(response.body.id).to.be.equal(captain.id);
    expect(response.body.repoItems).to.have.length(0);
  });

  it('should successfully return a list of items', async () => {
    await database.repoItem.create({ data: { id: 'ABCDEF', type: 'computer', forUserId: captain.id, zone: 'Zone 1' } });
    const response = await request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(captain.id).toString('base64'))}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.firstname).to.be.equal(captain.firstname);
    expect(response.body.lastname).to.be.equal(captain.lastname);
    expect(response.body.place).to.be.equal(captain.place);
    expect(response.body.id).to.be.equal(captain.id);
    expect(response.body.repoItems).to.have.length(1);
    expect(response.body.repoItems[0].type).to.be.equal('computer');
    expect(response.body.repoItems[0].id).to.be.equal('ABCDEF');
    expect(response.body.repoItems[0].zone).to.be.equal('Zone 1');
  });

  it('should  fail as user is a spectator', async () => {
    await database.user.update({ where: { id: nonAdmin.id }, data: { type: 'spectator' } });
    return request(app)
      .get(`/admin/repo/user?id=${encodeURIComponent(encrypt(nonAdmin.id).toString('base64'))}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.OnlyPlayersAllowed });
  });
});
