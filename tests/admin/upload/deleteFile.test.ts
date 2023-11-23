import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as uploadOperation from '../../../src/operations/upload';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { setLoginAllowed } from '../../../src/operations/settings';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import * as uploads from '../../upload';

describe('DELETE /admin/upload', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  const path = encodeURIComponent('tournaments/lol-logo.webp');

  after(async () => {
    await database.orga.deleteMany();
    await database.user.deleteMany();
    uploads.existingFiles.push('tournaments/lol-logo.webp');
  });

  before(async () => {
    await setLoginAllowed(true);

    admin = await createFakeUser({ permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({ type: UserType.player });
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).delete(`/admin/upload/${path}`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .delete(`/admin/upload/${path}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(uploadOperation, 'deleteFile').throws('Unexpected error');

    await request(app)
      .delete(`/admin/upload/${path}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail because no path is provided', async () => {
    await request(app)
      .delete(`/admin/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.RouteNotFound });
  });

  it('should successfully delete the file', async () => {
    await request(app)
      .delete(`/admin/upload/${path}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 0, message: 'Fichier supprimé avec succès' });
  });

  it('should fail as the path as already been deleted', async () => {
    await request(app)
      .delete(`/admin/upload/${path}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: "Le fichier n'existe pas" });
  });
});
