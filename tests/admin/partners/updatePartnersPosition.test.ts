import request from 'supertest';
import { Partner } from '@prisma/client';
import { expect } from 'chai';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as partnerOperations from '../../../src/operations/partner';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakePartner, createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';

describe('PATCH /admin/partners', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  const partners: Partner[] = [];
  let validBody: { partners: { id: string; position: number }[] };

  after(async () => {
    await database.user.deleteMany();
    await database.partner.deleteMany();
  });

  before(async () => {
    for (let index = 0; index < 10; index++) {
      partners.push(await createFakePartner({}));
    }

    validBody = {
      partners: [
        {
          id: partners[0].id,
          position: 1,
        },
        {
          id: partners[1].id,
          position: 0,
        },
      ],
    };

    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({type: UserType.player});
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/partners`).send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .patch(`/admin/partners`)
      .send(validBody)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(partnerOperations, 'updatePartnersPosition').throws('Unexpected error');

    await request(app)
      .patch(`/admin/partners`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it("should throw an error as partner's id does not exist", async () => {
    await request(app)
      .patch('/admin/partners')
      .send({
        partners: [
          {
            id: 'aaaaaa',
            position: 1,
          },
          {
            id: 'aaaaaa',
            position: 0,
          },
        ],
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.NotFound });
  });

  it("should throw an error as partner's position is not a number", async () => {
    await request(app)
      .patch('/admin/partners')
      .send({
        partners: [
          {
            id: partners[0].id,
            position: 'aaaaaa',
          },
          {
            id: partners[1].id,
            position: 0,
          },
        ],
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('should successfully update the partners', async () => {
    const result = await request(app)
      .patch(`/admin/partners`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      result.body.find((a: { id: string; position: number }) => a.id === validBody.partners[0].id).position,
    ).to.equal(validBody.partners[0].position);
    expect(
      result.body.find((a: { id: string; position: number }) => a.id === validBody.partners[1].id).position,
    ).to.equal(validBody.partners[1].position);
  });
});
