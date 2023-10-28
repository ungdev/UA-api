import request from 'supertest';
import { nanoid } from 'nanoid';
import { faker } from '@faker-js/faker';
import { Partner } from '@prisma/client';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as partnerOperations from '../../../src/operations/partner';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import { fetchPartners } from '../../../src/operations/partner';

describe('PATCH /admin/partners/{partnerId}', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  let partners: Partner[];

  after(async () => {
    await database.user.deleteMany();
    await database.partner.deleteMany();
  });

  before(async () => {
    const partnersList = [] as Partner[];

    for (let index = 0; index < 10; index++) {
      partnersList.push({
        id: nanoid(),
        name: faker.company.name(),
        description: faker.lorem.paragraph(),
        link: faker.internet.url(),
        display: true,
        position: index,
      });
    }

    await database.partner.createMany({
      data: partnersList,
    });

    partners = await fetchPartners();

    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser();
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
