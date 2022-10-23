import { expect } from 'chai';
import request from 'supertest';
import { Item } from '@prisma/client';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User } from '../../../src/types';
import { generateToken } from '../../../src/utils/users';
import { fetchAllItems } from '../../../src/operations/item';

describe('GET /admin/items/:itemId', () => {
  let user: User;
  let admin: User;
  let item: Item;
  let adminToken: string;
  let validBody: { newStock: number };

  before(async () => {
    [item] = await fetchAllItems();
    user = await createFakeUser();
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = generateToken(admin);
    validBody = { newStock: 18 };
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/items/${item.id}`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .get(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the item is not found', () =>
    request(app)
      .get(`/admin/items/POTATO`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.ItemNotFound }));

  it('should return the item with proper stock and left value', async () => {
    await request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(200);

    const { body } = await request(app)
      .get(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.stock).to.be.equal(validBody.newStock);
  });
});
