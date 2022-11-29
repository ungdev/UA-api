import request from 'supertest';
import { expect } from 'chai';
import { RepoLogAction } from '@prisma/client';
import { scanUser } from '../../../src/operations/user';
import database from '../../../src/services/database';
import { Error, Permission, Team, User } from '../../../src/types';
import { getCaptain } from '../../../src/utils/teams';
import { generateToken } from '../../../src/utils/users';
import { createFakeTeam, createFakeUser } from '../../utils';
import app from '../../../src/app';
import { lockTeam } from '../../../src/operations/team';

describe('DELETE /admin/repo/user/:userId/items/:itemId', () => {
  let admin: User;
  let adminToken: string;
  let nonAdmin: User;
  let nonAdminToken: string;
  let team: Team;
  let captain: User;

  before(async () => {
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = generateToken(admin);
    nonAdmin = await createFakeUser();
    nonAdminToken = generateToken(nonAdmin);
    team = await createFakeTeam();
    captain = getCaptain(team);
  });
  after(async () => {
    await database.repoLog.deleteMany();
    await database.repoItem.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail as user is not authenticated', async () => {
    await request(app)
      .delete(`/admin/repo/user/${nonAdmin.id}/items/ABCDEF`)
      .expect(401, { error: Error.Unauthenticated });
  });

  it("should fail as user isn't an admin", async () => {
    await request(app)
      .delete(`/admin/repo/user/${nonAdmin.id}/items/ABCDEF`)
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it("should fail as user doesn't exist", async () => {
    await request(app)
      .delete('/admin/repo/user/ABCDEF/items/ABCDEF')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail as user has not been scanned', async () => {
    await request(app)
      .delete(`/admin/repo/user/${captain.id}/items/ABCDEF`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as user doesn't have a team", async () => {
    await scanUser(nonAdmin.id);
    await request(app)
      .delete(`/admin/repo/user/${nonAdmin.id}/items/ABCDEF`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as team isn't locked", async () => {
    await scanUser(captain.id);
    await request(app)
      .delete(`/admin/repo/user/${captain.id}/items/ABCDEF`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as the item doesn't exist", async () => {
    await lockTeam(team.id);
    await request(app)
      .delete(`/admin/repo/user/${captain.id}/items/ABCDEF`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.ItemNotFound });
  });

  it("should fail as the item doesn't belong to the user", async () => {
    await database.repoItem.create({
      data: { id: 'ABCDEF', type: 'computer', forUserId: nonAdmin.id, zone: 'Zone 1' },
    });
    await request(app)
      .delete(`/admin/repo/user/${captain.id}/items/ABCDEF`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403, { error: Error.NotYourItem });
  });

  it('should successfully remove an item from the repo', async () => {
    await database.repoItem.create({
      data: { id: 'GHIJKL', type: 'computer', forUserId: captain.id, zone: 'Zone 1' },
    });
    await request(app)
      .delete(`/admin/repo/user/${captain.id}/items/GHIJKL`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const item = await database.repoItem.findUnique({ where: { id: 'GHIJKL' } });
    expect(item?.zone).not.to.be.null;
    expect(item?.pickedUp).to.be.true;
    const log = await database.repoLog.findFirst({
      where: { itemId: item?.id, action: RepoLogAction.removed, forUserId: captain.id },
    });
    expect(log).to.not.be.null;
  });

  it('should fail as user is a spectator', async () => {
    await database.user.update({ where: { id: nonAdmin.id }, data: { type: 'spectator' } });
    return request(app)
      .delete(`/admin/repo/user/${nonAdmin.id}/items/ABCDEF`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.OnlyPlayersAllowed });
  });
});
