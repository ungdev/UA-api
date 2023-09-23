import request from 'supertest';
import sharp from 'sharp';
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

  function generateDummyJpgBuffer(size: number) {
    const sizeInPixels = Math.ceil(Math.sqrt(size / 3));
    return sharp({
      create: {
        width: sizeInPixels,
        height: sizeInPixels,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  const validObject = {
    name: 'test',
    path: 'tournaments',
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
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(1), 'test.jpg')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the path is missing', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .attach('file', await generateDummyJpgBuffer(1), 'test.jpg')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('should fail as the file is too big', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(100000000), 'test.jpg')
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
      .attach('file', await generateDummyJpgBuffer(1), 'test.jpg')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 1, message: "Le chemin n'est pas autorisé" });
  });

  it('should successfully upload the file', async () => {
    await request(app)
      .post(`/admin/upload`)
      .field('name', validObject.name)
      .field('path', validObject.path)
      .attach('file', await generateDummyJpgBuffer(1), 'test.jpg')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { status: 0, message: 'Fichier téléversé avec succès' });
  });
});
