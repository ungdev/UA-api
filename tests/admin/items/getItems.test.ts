import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Item, Permission, User, UserType } from '../../../src/types';
import { generateToken } from '../../../src/utils/users';
import { fetchAllItems } from '../../../src/operations/item';

describe('GET /admin/items', () => {
  let user: User;
  let admin: User;
  let items: Item[];
  let adminToken: string;

  before(async () => {
    items = await fetchAllItems();
    user = await createFakeUser({ type: UserType.player });
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.orga.deleteMany();
await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/items`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .get(`/admin/items`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should return items list with proper stock and left value', async () => {
    const { body } = await request(app).get(`/admin/items`).set('Authorization', `Bearer ${adminToken}`).expect(200);

    for (const responseItem of body) {
      expect(responseItem.left).to.be.equal(items.find((item) => item.name === responseItem.name).left);
      expect(responseItem.stock).to.be.equal(items.find((item) => item.name === responseItem.name).stock);
    }
  });
});
