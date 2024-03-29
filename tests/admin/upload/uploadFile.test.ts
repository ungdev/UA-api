import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as uploadOperation from '../../../src/operations/upload';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakeUser, generateDummyJpgBuffer, generateDummyPngBuffer } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import * as uploads from '../../upload';

describe('POST /admin/upload', () => {
  let nonAdminUser: User;
  let orga: User;
  let admin: User;
  let adminToken: string;

  const validObject = {
    name: 'test',
    path: 'tournaments',
  };

  after(async () => {
    await database.orga.deleteMany();
    await database.user.deleteMany();
    uploads.existingFiles.splice(uploads.existingFiles.indexOf('orga/test.webp'), 1);
  });

  before(async () => {
    admin = await createFakeUser({ permissions: [Permission.admin] });
    orga = await createFakeUser({ permissions: [Permission.orga] });
    nonAdminUser = await createFakeUser({ type: UserType.player });
    adminToken = generateToken(admin);
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/upload`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is a player', async () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(1), 'test.webp')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the user is not an administrator', async () => {
    const orgaToken = generateToken(orga);
    return request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(1), 'test.webp')
      .set('Authorization', `Bearer ${orgaToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should succeed as the user is calling orga path', async () => {
    const orgaToken = generateToken(orga);
    return request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', 'orga')
      .attach('file', await generateDummyJpgBuffer(1), 'test.webp')
      .set('Authorization', `Bearer ${orgaToken}`)
      .expect(200, { status: 0, message: 'Fichier téléversé avec succès' });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(uploadOperation, 'uploadFile').throws('Unexpected error');

    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(1), 'test.webp')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the path is missing', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .attach('file', await generateDummyJpgBuffer(1), 'test.webp')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('should fail as the file is too big', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(100000000), 'test.webp')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: "La taille maximale d'un fichier est de 5MB" });
  });

  it('should fail as the file type is not allowed', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(1), 'test.gif')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: 'Type de fichier non autorisé' });
  });

  it('should fail as the path is not allowed', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', 'test')
      .attach('file', await generateDummyJpgBuffer(1), 'test.webp')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: "Le chemin n'est pas autorisé" });
  });

  it('should successfully upload the file with a jpg', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(1), { filename: 'test.jpg', contentType: 'image/jpeg' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 0, message: 'Fichier téléversé avec succès' });
    uploads.existingFiles.splice(uploads.existingFiles.indexOf('tournaments/test.webp'), 1);
  });

  it('should successfully upload the file with a png', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyPngBuffer(1), { filename: 'test.png', contentType: 'image/png' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 0, message: 'Fichier téléversé avec succès' });
    uploads.existingFiles.splice(uploads.existingFiles.indexOf('tournaments/test.webp'), 1);
  });
});
