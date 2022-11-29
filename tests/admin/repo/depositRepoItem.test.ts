import request from 'supertest';
import { expect } from 'chai';
import { nanoid } from 'nanoid';
import { scanUser } from '../../../src/operations/user';
import database from '../../../src/services/database';
import { Error, Permission, Team, User } from '../../../src/types';
import { getCaptain } from '../../../src/utils/teams';
import { generateToken } from '../../../src/utils/users';
import { createFakeTeam, createFakeUser } from '../../utils';
import app from '../../../src/app';
import { lockTeam } from '../../../src/operations/team';
import { removeRepoItem } from '../../../src/operations/repo';

describe('POST /admin/repo/user/:userId/items', () => {
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
    await request(app).post(`/admin/repo/user/${nonAdmin.id}/items`).expect(401, { error: Error.Unauthenticated });
  });

  it("should fail as user isn't an admin", async () => {
    await request(app)
      .post(`/admin/repo/user/${nonAdmin.id}/items`)
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it("should fail as user doesn't exist", async () => {
    await request(app)
      .post('/admin/repo/user/ABCDEF/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.UserNotFound });
  });

  it('should fail as user has not been scanned', async () => {
    await request(app)
      .post(`/admin/repo/user/${captain.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as user doesn't have a team", async () => {
    await scanUser(nonAdmin.id);
    await request(app)
      .post(`/admin/repo/user/${nonAdmin.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it("should fail as team isn't locked", async () => {
    await scanUser(captain.id);
    await request(app)
      .post(`/admin/repo/user/${captain.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(405, { error: Error.NotScannedOrLocked });
  });

  it('should fail as user asks to deposit 2 computers', async () => {
    await lockTeam(team.id);
    await request(app)
      .post(`/admin/repo/user/${captain.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { type: 'computer', zone: 'Zone 1' },
          { type: 'computer', zone: 'Zone 2' },
        ],
      })
      .expect(405, { error: Error.AlreadyHaveComputer });
  });

  it('should successfully add a new item to the repo', async () => {
    await request(app)
      .post(`/admin/repo/user/${captain.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'computer', zone: 'Zone 1' }] })
      .expect(201);
    const item = await database.repoItem.findFirst({
      where: { forUserId: captain.id, type: 'computer', zone: 'Zone 1' },
    });
    expect(item).to.not.be.null;
    const log = await database.repoLog.findFirst({
      where: { forUserId: captain.id, action: 'added', itemId: item?.id },
    });
    expect(log).to.not.be.null;
  });

  it('should sucessfully re-add an item', async () => {
    await database.repoLog.deleteMany();
    let itemBefore = await database.repoItem.findFirst({
      where: { forUserId: captain.id, type: 'computer' },
    });
    if (!itemBefore) {
      itemBefore = { forUserId: captain.id, id: nanoid(), type: 'computer', zone: 'Zone 1' };
      await database.repoItem.create({ data: itemBefore });
    }
    await removeRepoItem(itemBefore.id, captain.id);
    await request(app)
      .post(`/admin/repo/user/${captain.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'computer', zone: 'Zone 1' }] })
      .expect(201);
    const itemAfter = await database.repoItem.findFirst({
      where: { forUserId: captain.id, type: 'computer', zone: 'Zone 1' },
    });
    expect(itemAfter).to.not.be.null;
    const log = await database.repoLog.findFirst({
      where: { forUserId: captain.id, action: 'added', itemId: itemAfter?.id },
    });
    expect(log).to.not.be.null;
  });

  it('should successfully add an item for a spectator', async () => {
    await database.user.update({ where: { id: nonAdmin.id }, data: { type: 'spectator' } });
    await request(app)
      .post(`/admin/repo/user/${nonAdmin.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'computer', zone: 'Zone 1' }] })
      .expect(201);

    const item = await database.repoItem.findFirst({
      where: { forUserId: nonAdmin.id, type: 'computer', zone: 'Zone 1' },
    });
    expect(item).to.not.be.null;
    const log = await database.repoLog.findFirst({
      where: { forUserId: nonAdmin.id, action: 'added', itemId: item?.id },
    });
    expect(log).to.not.be.null;
  });

  it('should fail as user already have a computer', async () => {
    await request(app)
      .post(`/admin/repo/user/${captain.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'computer', zone: 'Zone 1' }] })
      .expect(405, { error: Error.AlreadyHaveComputer });
  });
});
