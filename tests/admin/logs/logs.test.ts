import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Permission, User } from '../../../src/types';
import * as userUtils from '../../../src/utils/users';

describe('GET /admin/logs', () => {
  let admin: User;
  let adminToken: string;

  before(async () => {
    admin = await createFakeUser({ permission: Permission.admin });
    adminToken = userUtils.generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should not return logs from invalid request', () =>
    request(app).get('/admin/logs').set('Authorization', `Bearer ${adminToken}`).expect(400));

  it('should return the logs', async () => {
    const { body: logs } = await request(app)
      .get(`/admin/logs?page=0`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(logs.logs).to.be.lengthOf(0);
    expect(logs.pageIndex).to.be.equal(0);
    expect(logs.maxPages).to.be.equal(0);
  });
});
