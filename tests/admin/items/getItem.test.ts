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

  before(async () => {
    [item] = await fetchAllItems();
    user = await createFakeUser();
    admin = await createFakeUser({ permissions: [Permission.admin] });
    adminToken = generateToken(admin);
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
    const { body } = await request(app)
      .get(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(body.id).to.be.equal(item.id);
    expect(body.name).to.be.equal(item.name);
    expect(body.category).to.be.equal(item.category);
    expect(body.attribute).to.be.equal(item.attribute);
    expect(body.price).to.be.equal(item.price);
    expect(body.reducedPrice).to.be.equal(item.reducedPrice);
    expect(body.infos).to.be.equal(item.infos);
    expect(body.image).to.be.equal(item.image);
    expect(body.stock).to.be.equal(item.stock);
    expect(body.availableFrom).to.be.equal(item.availableFrom ? item.availableFrom.toISOString() : null);
    expect(body.availableUntil).to.be.equal(item.availableUntil ? item.availableUntil.toISOString() : null);
  });
});
