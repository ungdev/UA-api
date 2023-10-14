import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as partnerOperations from '../../../src/operations/partner';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { generateToken } from '../../../src/utils/users';
import { createFakeUser } from '../../utils';

describe('POST /admin/partners', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  after(async () => {
    await database.partner.deleteMany();
    await database.user.deleteMany();
  });

  before(async () => {
    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser();
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app)
      .post(`/admin/partners`)
      .send({ name: 'test', link: 'test', display: true, position: 0 })
      .expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .post(`/admin/partners`)
      .send({ name: 'test', link: 'test', display: true, position: 0 })
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(partnerOperations, 'addPartner').throws('Unexpected error');

    await request(app)
      .post('/admin/partners')
      .send({ name: 'test', link: 'test', display: true, position: 0 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of partners', async () => {
    const response = await request(app)
      .post('/admin/partners')
      .send({ name: 'test', link: 'test', display: true, position: 0 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(response.body).to.have.all.keys(['id', 'name', 'link', 'display', 'position']);
    expect(response.body.name).to.equal('test');
    expect(response.body.link).to.equal('test');
    expect(response.body.display).to.equal(true);
  });
});
