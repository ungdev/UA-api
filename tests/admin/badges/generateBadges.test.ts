import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakeUser } from '../../utils';
import * as userUtils from '../../../src/utils/users';
import { updateAdminUser } from '../../../src/operations/user';
import { sandbox } from '../../setup';
import * as badgeUtils from '../../../src/utils/badge';

describe('POST /admin/badges', () => {
  let adminUser: User;
  let adminToken: string;
  let user: User;
  let userToken: string;
  let presUser: User;
  let respoElec: User;
  let respoSSL: User;
  let respoSecu: User;
  let respoLog: User;
  let respoRozo: User;
  let coord: User;
  let defaultUser: User;

  before(async () => {
    adminUser = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = userUtils.generateToken(adminUser);

    user = await createFakeUser({ permissions: [Permission.orga] });
    userToken = userUtils.generateToken(user);

    // Add a mainCommission to the user
    updateAdminUser(user, {
      orgaMainCommission: 'vieux',
      orgaRoles: [{ commission: 'vieux', commissionRole: 'member' }],
    });

    presUser = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(presUser, {
      orgaMainCommission: 'coord',
      orgaRoles: [{ commission: 'coord', commissionRole: 'respo' }],
    });

    respoElec = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(respoElec, {
      orgaMainCommission: 'elec',
      orgaRoles: [{ commission: 'elec', commissionRole: 'respo' }],
    });

    respoSSL = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(respoSSL, {
      orgaMainCommission: 'ssl',
      orgaRoles: [{ commission: 'ssl', commissionRole: 'respo' }],
    });

    respoSecu = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(respoSecu, {
      orgaMainCommission: 'secu',
      orgaRoles: [{ commission: 'secu', commissionRole: 'respo' }],
    });

    respoLog = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(respoLog, {
      orgaMainCommission: 'log',
      orgaRoles: [{ commission: 'log', commissionRole: 'respo' }],
    });

    respoRozo = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(respoRozo, {
      orgaMainCommission: 'rozo',
      orgaRoles: [{ commission: 'rozo', commissionRole: 'respo' }],
    });

    coord = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(coord, {
      orgaMainCommission: 'coord',
      orgaRoles: [{ commission: 'coord', commissionRole: 'member' }],
    });

    defaultUser = await createFakeUser({ permissions: [Permission.orga] });
    updateAdminUser(defaultUser, {
      orgaMainCommission: 'dev',
      orgaRoles: [{ commission: 'dev', commissionRole: 'member' }],
    });
  });

  after(async () => {
    await database.orgaRole.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  it('should return an error for unauthenticated user', async () => {
    await request(app).post('/admin/badges').send({}).expect(401, { error: Error.Unauthenticated });
  });

  it('should return an error for non-admin user', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
      .expect(403, { error: Error.NoPermission });
  });

  it('should return an error for invalid body', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400, { error: Error.InvalidBody });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(badgeUtils, 'generateBadge').throws('Unexpected error');

    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [{ type: 'orgas' }],
      })
      .expect(500, { error: Error.InternalServerError });
  });

  it('should generate badges for orgas', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [{ type: 'orgas' }],
      })
      .expect(200)
      .then((response) => {
        expect(response.headers['content-type']).to.equal('application/pdf');
      });
  });

  it('should generate custom badges', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [{ type: 'custom', quantity: 5, permission: 'restricted', name: 'Custom Badge' }],
      })
      .expect(200)
      .then((response) => {
        expect(response.headers['content-type']).to.equal('application/pdf');
      });
  });

  it('should generate a single badge for a specific user', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [{ type: 'single', email: user.email }],
      })
      .expect(200)
      .then((response) => {
        expect(response.headers['content-type']).to.equal('application/pdf');
      });
  });

  it('should return an error for a non-existing user in single type', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [{ type: 'single', email: 'nonexistinguser@example.com' }],
      })
      .expect(404, { error: `User (nonexistinguser@example.com) not found` });
  });

  it('should generate badges even without roles', async () => {
    await database.orgaRole.deleteMany();
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [{ type: 'orgas' }],
      })
      .expect(200)
      .then((response) => {
        expect(response.headers['content-type']).to.equal('application/pdf');
      });
  });

  it('should trigger the hasError flag', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [
          { type: 'single', email: 'nonexistinguser@example.com' },
          { type: 'single', email: 'nonexistinguser@example.com' },
        ],
      })
      .expect(404, { error: `User (nonexistinguser@example.com) not found` });
  });

  it('should generate a single custom badge', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [
          {
            type: 'singlecustom',
            commissionRole: 'member',
            commissionId: 'vieux',
            firstname: 'John',
            lastname: 'Doe',
          },
        ],
      })
      .expect(200)
      .then((response) => {
        expect(response.headers['content-type']).to.equal('application/pdf');
      });
  });

  it('should return an error for invalid type', async () => {
    await request(app)
      .post('/admin/badges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [{ type: 'invalidtype' }],
      })
      .expect(400, { error: Error.InvalidBody });
  });
});
