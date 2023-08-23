import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as settingsOperations from '../../../src/operations/settings';
import database from '../../../src/services/database';
import { Error } from '../../../src/types';
import { faker } from '@faker-js/faker';
import nanoid from '../../../src/utils/nanoid';
import { setLoginAllowed, setShopAllowed, setTrombiAllowed } from '../../../src/operations/settings';

describe('PATCH /admin/settings', () => {
  after(async () => {
    await setLoginAllowed(true);
    await setShopAllowed(true);
    await setTrombiAllowed(true);
  });

  before(async () => {
    await setLoginAllowed(false);
    await setShopAllowed(false);
    await setTrombiAllowed(false);
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(settingsOperations, 'setLoginAllowed').throws('Unexpected error');

    await request(app).patch('/admin/settings/login').send({ value: true }).expect(500, { error: Error.InternalServerError });
  });

  it('should throw an error as setting\'s id does not exist', async () => {
    await request(app).patch('/admin/settings/aaaaaa').send({ value: true }).expect(404, { error: Error.NotFound });
  });

  it('should throw an error as setting\'s value is not a boolean', async () => {
    await request(app).patch('/admin/settings/login').send({ value: 'hello' }).expect(400, { error: Error.InvalidPermission });
  });

  it('should successfully update the settings', async () => {
    await request(app).patch('/admin/settings/login').send({ value: true }).expect(200, { id: "login", value: true });

    const login = await settingsOperations.fetchSetting('login');

    expect(login).to.be.equal(true);
  });
});
