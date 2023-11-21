import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as responses from '../../src/utils/responses';
import database from '../../src/services/database';
import { Error, Permission, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';

describe('GET /users/current', () => {
  let user: User;
  let token: string;
  let orgaUser: User;
  let orgaToken: string;

  before(async () => {
    user = await createFakeUser({ username: 'alban' });
    token = generateToken(user);

    orgaUser = await createFakeUser({
      permissions: [Permission.orga],
      orgaRoles: [{ role: 'respo', commission: 'dev' }],
    });
    orgaToken = generateToken(orgaUser);
  });

  after(async () => {
    await database.orgaRole.deleteMany();
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should fail as the user is not authenticated', async () => {
    await request(app).get('/users/current').expect(401, { error: Error.Unauthenticated });
  });

  it('should throw an unexpected error', async () => {
    sandbox.stub(responses, 'success').throws('Unexpected error');

    await request(app)
      .get(`/users/current`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return the user', async () => {
    const { body } = await request(app).get(`/users/current`).set('Authorization', `Bearer ${token}`).expect(200);

    expect(body.username).to.be.equal('alban');
    expect(body.hasPaid).to.be.false;
    expect(body.createdAt).to.be.undefined;
    expect(body.orgaRoles).to.be.empty;
  });

  it('should return the organizer with its commissions', async () => {
    const { body } = await request(app).get('/users/current').set('Authorization', `Bearer ${orgaToken}`).expect(200);

    expect(body.orgaRoles).to.be.of.length(1);
    expect(body.orgaRoles[0].commissionRole).to.be.equal('respo');
    expect(body.orgaRoles[0].commission.id).to.be.equal('dev');
    expect(body.orgaRoles[0].commission.position).to.be.undefined;
  });
});
