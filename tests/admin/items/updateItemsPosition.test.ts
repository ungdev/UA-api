import request from 'supertest';
import { Item } from '@prisma/client';
import { expect } from 'chai';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as itemOperations from '../../../src/operations/item';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import { fetchAllItems } from '../../../src/operations/item';

describe('PATCH /admin/items', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  let items: Item[];
  let validBody: { items: { id: string; position: number }[] };

  after(async () => {
    await database.user.deleteMany();
  });

  before(async () => {
    items = await fetchAllItems();

    validBody = {
      items: [
        {
          id: items[0].id,
          position: 1,
        },
        {
          id: items[1].id,
          position: 0,
        },
      ],
    };

    admin = await createFakeUser({ permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({ type: UserType.player });
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/items`).send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .patch(`/admin/items`)
      .send(validBody)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(itemOperations, 'updateItemsPosition').throws('Unexpected error');

    await request(app)
      .patch(`/admin/items`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it("should throw an error as item's id does not exist", async () => {
    await request(app)
      .patch('/admin/items')
      .send({
        items: [
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

  it("should throw an error as item's position is not a number", async () => {
    await request(app)
      .patch('/admin/items')
      .send({
        items: [
          {
            id: items[0].id,
            position: 'aaaaaa',
          },
          {
            id: items[1].id,
            position: 0,
          },
        ],
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('should successfully update the items', async () => {
    const result = await request(app)
      .patch(`/admin/items`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(result.body.find((a: { id: string; position: number }) => a.id === validBody.items[0].id).position).to.equal(
      validBody.items[0].position,
    );
    expect(result.body.find((a: { id: string; position: number }) => a.id === validBody.items[1].id).position).to.equal(
      validBody.items[1].position,
    );
  });
});
