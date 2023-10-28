import { expect } from 'chai';
import request from 'supertest';
import { Partner } from '@prisma/client';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as partnerOperations from '../../../src/operations/partner';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakePartner, createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import { fetchPartners } from '../../../src/operations/partner';

describe('DELETE /admin/partners/{partnerId}', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  let partners: Partner[];

  after(async () => {
    await database.user.deleteMany();
    await database.partner.deleteMany();
  });

  before(async () => {
    for (let index = 0; index < 10; index++) {
      await createFakePartner({});
    }

    partners = await fetchPartners();

    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser();
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).delete(`/admin/partners/${partners[0].id}`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .delete(`/admin/partners/${partners[0].id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(partnerOperations, 'removePartner').throws('Unexpected error');

    await request(app)
      .delete(`/admin/partners/${partners[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it("should throw an error as partner's id does not exist", async () => {
    await request(app)
      .delete('/admin/partners/aaaaaa')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.NotFound });
  });

  it('should successfully delete the partner', async () => {
    await request(app)
      .delete(`/admin/partners/${partners[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    // test if partner id is not in database anymore
    const partner = await database.partner.findUnique({
      where: {
        id: partners[0].id,
      },
    });

    expect(partner).to.be.null;
  });
});
