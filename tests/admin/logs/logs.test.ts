import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User, TournamentId, UserType } from '../../../src/types';
import * as userUtils from '../../../src/utils/users';
import { sandbox } from '../../setup';
import * as logOperations from '../../../src/operations/log';

describe('GET /admin/logs', () => {
  let admin: User;
  let adminToken: string;
  let user: User;

  before(async () => {
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = userUtils.generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.team.deleteMany();
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

  it('should return generated user logs', async () => {
    user = await createFakeUser();
    await request(app)
      .post('/auth/reset-password/ask')
      .send({
        email: user.email,
      })
      .expect(204);

    const { body: response } = await request(app)
      .get(`/admin/logs?page=0&userId=${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.logs).to.have.lengthOf(1);
    expect(response.count).to.be.equal(1);
    expect(response.pageIndex).to.be.equal(0);
    expect(response.pageCount).to.be.equal(1);
  });

  it('should return all generated logs', async () => {
    const { body: response } = await request(app)
      .get(`/admin/logs?page=0`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.logs).to.have.lengthOf(1);
    expect(response.count).to.be.equal(1);
    expect(response.pageIndex).to.be.equal(0);
    expect(response.pageCount).to.be.equal(1);
  });

  it('should return generated team logs', async () => {
    const { body: team } = await request(app)
      .post('/teams')
      .send({
        name: 'fake-team',
        tournamentId: TournamentId.lolCompetitive,
        userType: UserType.player,
      })
      .set('Authorization', `Bearer ${userUtils.generateToken(user)}`)
      .expect(201);

    const { body: response } = await request(app)
      .get(`/admin/logs?page=0&teamId=${team.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.logs).to.have.lengthOf(2);
    expect(response.count).to.be.equal(2);
    expect(response.pageIndex).to.be.equal(0);
    expect(response.pageCount).to.be.equal(1);
  });
});
