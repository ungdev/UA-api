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

  const validObject = {
    name: 'test',
    path: 'tournaments',
    file: new File(['foo'], 'foo.jpg', {
      type: 'image/jpeg',
    }),
  };

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

  it('should fail with an internal server error', async () => {
    sandbox.stub(uploadOperation, 'uploadFile').throws('Unexpected error');

    await request(app)
      .post(`/admin/upload`)
      .send(validObject)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the name is missing', async () => {
    await request(app)
      .post(`/admin/upload`)
      .send({
        path: validObject.path,
        file: validObject.file,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: 'Paramètres manquants' });
  });

  function generateBits(size: number) {
    const array = new Uint8Array(size);
    window.crypto.getRandomValues(array);
    return array;
  }

  it('should fail as the file is too big', async () => {
    await request(app)
      .post(`/admin/upload`)
      .send({
        ...validObject,
        file: new File([generateBits(6000001)], 'foo.jpg', {
          type: 'image/jpeg',
        }),
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: "La taille maximale d'un fichier est de 5MB" });
  });

  it('should fail as the file type is not allowed', async () => {
    await request(app)
      .post(`/admin/upload`)
      .send({
        ...validObject,
        file: new File(['foo'], 'foo.jpg', {
          type: 'image/gif',
        }),
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: 'Type de fichier non autorisé' });
  });

  it('should fail as the file extension is not allowed', async () => {
    await request(app)
      .post(`/admin/upload`)
      .send({
        ...validObject,
        file: new File(['foo'], 'foo.gif', {
          type: 'image/jpeg',
        }),
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: 'Extension de fichier non autorisée' });
  });

  it('should fail as the path is not allowed', async () => {
    await request(app)
      .post(`/admin/upload`)
      .send({
        ...validObject,
        path: 'test',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: "Le chemin n'est pas autorisé" });
  });

  it('should successfully upload the file', async () => {
    await request(app)
      .post(`/admin/upload`)
      .send(validObject)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 0, message: 'Fichier téléversé avec succès' });
  });
});
