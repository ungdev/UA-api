import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as settingsOperations from '../../../src/operations/settings';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { setLoginAllowed, setShopAllowed, setTrombiAllowed } from '../../../src/operations/settings';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';

describe('PATCH /admin/settings', () => {
  let nonAdminUser: User;
  let orga: User;
  let admin: User;
  let adminToken: string;

  after(async () => {
    await setLoginAllowed(true);
    await setShopAllowed(true);
    await setTrombiAllowed(true);
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  before(async () => {
    await setLoginAllowed(true);
    await setShopAllowed(false);
    await setTrombiAllowed(false);
    admin = await createFakeUser({ permissions: [Permission.admin] });
    orga = await createFakeUser({ permissions: [Permission.orga] });
    nonAdminUser = await createFakeUser({ type: UserType.player });
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/settings/login`).send({ value: true }).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is a player', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .patch(`/admin/settings/login`)
      .send({ value: false })
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not an administrator', () => {
    const orgaToken = generateToken(orga);
    return request(app)
      .patch(`/admin/settings/login`)
      .send({ value: false })
      .set('Authorization', `Bearer ${orgaToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(settingsOperations, 'setLoginAllowed').throws('Unexpected error');

    await request(app)
      .patch('/admin/settings/login')
      .send({ value: false })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it("should throw an error as setting's id does not exist", async () => {
    await request(app)
      .patch('/admin/settings/aaaaaa')
      .send({ value: true })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.NotFound });
  });

  it("should throw an error as setting's value is not a boolean", async () => {
    await request(app)
      .patch('/admin/settings/login')
      .send({ value: 'hello' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('should successfully update the settings', async () => {
    await request(app)
      .patch('/admin/settings/login')
      .send({ value: false })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { id: 'login', value: false });

    const login = await settingsOperations.fetchSetting('login');

    expect(login.id).to.be.equal('login');
    expect(login.value).to.be.equal(false);
  });

  it('should successfully update the settings', async () => {
    await request(app)
      .patch('/admin/settings/shop')
      .send({ value: false })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { id: 'shop', value: false });

    const shop = await settingsOperations.fetchSetting('shop');

    expect(shop.id).to.be.equal('shop');
    expect(shop.value).to.be.equal(false);
  });

  it('should successfully update the settings', async () => {
    await request(app)
      .patch('/admin/settings/trombi')
      .send({ value: false })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { id: 'trombi', value: false });

    const trombi = await settingsOperations.fetchSetting('trombi');

    expect(trombi.id).to.be.equal('trombi');
    expect(trombi.value).to.be.equal(false);
  });
});
