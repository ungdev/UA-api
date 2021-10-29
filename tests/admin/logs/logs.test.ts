import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User } from '../../../src/types';
import * as userUtils from '../../../src/utils/users';
import { sandbox } from '../../setup';
import * as logOperations from '../../../src/operations/log';

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

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(logOperations, 'fetchLogs').throws('Unexpected error');

    await request(app)
      .get(`/admin/logs?page=0`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should not return logs from invalid request', () =>
    request(app).get('/admin/logs').set('Authorization', `Bearer ${adminToken}`).expect(400));
});
