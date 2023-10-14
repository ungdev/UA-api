import { expect } from 'chai';
import request from 'supertest';
import { Item } from '@prisma/client';
import app from '../../../src/app';
import { createFakeItem, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User } from '../../../src/types';
import { generateToken } from '../../../src/utils/users';

describe('PATCH /admin/items/:itemId', () => {
  let user: User;
  let admin: User;
  let item: Item;
  let adminToken: string;
  let validBody: { newStock: number; availableFrom: Date; availableUntil: Date };

  before(async () => {
    item = await createFakeItem({
      name: 'Chocapic',
      stock: 12,
      availableFrom: new Date(1970, 1, 1),
      availableUntil: new Date(1971, 1, 1),
    });
    user = await createFakeUser();
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = generateToken(admin);
    validBody = { newStock: 18, availableFrom: new Date(Date.now()), availableUntil: new Date(Date.now() + 1000) };
  });

  after(async () => {
    // Delete the user created
    await database.user.deleteMany();
    await database.item.delete({ where: { id: item.id } });
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/items/${item.id}`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the item is not found', () =>
    request(app)
      .patch(`/admin/items/POTATO`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(404, { error: Error.ItemNotFound }));

  it('should not change anything', async () => {
    const { body } = await request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    expect(body.stock).to.be.equal(item.stock);
    expect(body.availableFrom).to.be.equal(item.availableFrom.toISOString());
    expect(body.availableUntil).to.be.equal(item.availableUntil.toISOString());
  });

  it('should change the item stock and availability dates', async () => {
    const { body } = await request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(200);

    expect(body.stock).to.be.equal(validBody.newStock);
    expect(body.availableFrom).to.be.equal(validBody.availableFrom.toISOString());
    expect(body.availableUntil).to.be.equal(validBody.availableUntil.toISOString());
  });
});
