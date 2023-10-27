import { expect } from 'chai';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { Partner } from '@prisma/client';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as partnerOperations from '../../../src/operations/partner';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import nanoid from '../../../src/utils/nanoid';
import { generateToken } from '../../../src/utils/users';
import { createFakeUser } from '../../utils';

describe('GET /admin/partners', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  after(async () => {
    await database.partner.deleteMany();
    await database.user.deleteMany();
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

    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser();
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/partners`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .get(`/admin/partners`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(partnerOperations, 'fetchPartners').throws('Unexpected error');

    await request(app)
      .get('/admin/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of partners', async () => {
    const partners = await database.partner.findMany();

    // add display false to a random tournament
    await database.partner.update({
      where: {
        id: partners[0].id,
      },
      data: {
        display: false,
      },
    });

    const response = await request(app).get('/admin/partners').set('Authorization', `Bearer ${adminToken}`).expect(200);

    expect(response.body).to.have.lengthOf(partners.length);
    // Not to have tournaments[0] because it has display false
    expect(response.body).not.to.have.deep.members([partners[0]]);
    expect(response.body[0]).to.have.all.keys(['id', 'name', 'link', 'description', 'display', 'position']);
    expect(response.body[0].name).to.be.a('string');
    expect(response.body[0].link).to.be.a('string');
  });
});
