import request from 'supertest';
import { Partner } from '@prisma/client';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as partnerOperations from '../../../src/operations/partner';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakePartner, createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';

describe('PATCH /admin/partners/{partnerId}', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  const partners: Partner[] = [];

  after(async () => {
    await database.user.deleteMany();
    await database.partner.deleteMany();
  });

  before(async () => {
    for (let index = 0; index < 10; index++) {
      partners.push(await createFakePartner({}));
    }

    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({type: UserType.player});
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app)
      .patch(`/admin/partners/${partners[0].id}`)
      .send({ name: 'test', link: 'test', display: false })
      .expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .patch(`/admin/partners/${partners[0].id}`)
      .send({ name: 'test', link: 'test', display: false })
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(partnerOperations, 'updatePartner').throws('Unexpected error');

    await request(app)
      .patch(`/admin/partners/${partners[0].id}`)
      .send({ name: 'test', link: 'test', display: false })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it("should throw an error as partner's id does not exist", async () => {
    await request(app)
      .patch('/admin/partners/aaaaaa')
      .send({ name: 'test', link: 'test', display: false })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.NotFound });
  });

  it('should successfully update the partner', async () => {
    await request(app)
      .patch(`/admin/partners/${partners[0].id}`)
      .send({ name: 'test', link: 'test', display: false })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, {
        id: partners[0].id,
        name: 'test',
        description: partners[0].description,
        link: 'test',
        display: false,
        position: 0,
      });
  });
});
