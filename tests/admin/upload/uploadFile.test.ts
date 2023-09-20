import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as uploadOperation from '../../../src/operations/upload';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';

describe('POST /admin/upload', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  after(async () => {
    await database.user.deleteMany();
  });

  before(async () => {
    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser();
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/upload`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .post(`/admin/upload`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });
 
  // it('should fail with an internal server error', async () => {
  //   sandbox.stub(uploadOperation, 'uploadFile').throws('Unexpected error');

  //   await request(app)
  //     .post(`/admin/upload`)
  //     // .send({ path: 'tournaments/lol-logo.png' })
  //     .set('Authorization', `Bearer ${adminToken}`)
  //     .expect(500, { error: Error.InternalServerError });
  // });

  // it('should fail because no path is provided', async () => {
  //   await request(app)
  //     .post(`/admin/upload`)
  //     .set('Authorization', `Bearer ${adminToken}`)
  //     .expect(200, { status: 1, message: "Paramètres manquants" });
  // });

  // it('should successfully delete the file', async () => {
  //   await request(app)
  //     .post(`/admin/upload`)
  //     .set('Authorization', `Bearer ${adminToken}`)
  //     .expect(200, { status: 0, message: "Fichier supprimé avec succès" });
  // });

  // it("should fail as the path as already been deleted", async () => {
  //   await request(app)
  //     .post(`/admin/upload`)
  //     .set('Authorization', `Bearer ${adminToken}`)
  //     .expect(200, { status: 1, message: "Le fichier n'existe pas" });
  // });
});
