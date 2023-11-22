import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as userOperation from '../../../src/operations/user';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import { fetchUser } from '../../../src/operations/user';
import * as uploads from '../../upload';

describe('PATCH /admin/users/trombi', () => {
  let nonOrgaUser: User;
  let orga: User;
  let orgaToken: string;

  before(async () => {
    orga = await createFakeUser({ permissions: [Permission.orga] });
    nonOrgaUser = await createFakeUser({ type: UserType.player });
    orgaToken = generateToken(orga);
  });

  after(async () => {
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/users/trombi`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an orga', () => {
    const userToken = generateToken(nonOrgaUser);
    return request(app)
      .patch(`/admin/users/trombi`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(userOperation, 'updateTrombi').throws('Unexpected error');

    await request(app)
      .patch(`/admin/users/trombi`)
      .set('Authorization', `Bearer ${orgaToken}`)
      .send({ displayName: false, displayPhoto: false, displayUsername: true })
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail as the user has to display at least his name or his username', () =>
    request(app)
      .patch(`/admin/users/trombi`)
      .set('Authorization', `Bearer ${orgaToken}`)
      .send({ displayName: false, displayPhoto: false, displayUsername: false })
      .expect(400, { error: Error.ShowNameOrPseudo }));

  it('should successfully update the user and give back the filename', async () => {
    expect(orga.orgaDisplayName).to.be.false;
    expect(orga.orgaDisplayPhoto).to.be.false;
    expect(orga.orgaDisplayUsername).to.be.true;
    const { body } = await request(app)
      .patch(`/admin/users/trombi`)
      .set('Authorization', `Bearer ${orgaToken}`)
      .send({ displayName: true, displayPhoto: true, displayUsername: false })
      .expect(200);
    orga = await fetchUser(orga.id);
    expect(orga.orgaDisplayName).to.be.true;
    expect(orga.orgaDisplayPhoto).to.be.true;
    expect(orga.orgaDisplayUsername).to.be.false;
    expect(body.filename).to.startWith(orga.lastname);
    expect(body.filename).to.be.equal(orga.orgaPhotoFilename);
  });

  it('should successfully update the user and delete the old image', async () => {
    // First actually add the file at the specified location
    uploads.existingFiles.push(`orgas/${orga.orgaPhotoFilename}.png`);
    const { body } = await request(app)
      .patch(`/admin/users/trombi`)
      .send({ displayName: true, displayPhoto: true, displayUsername: true })
      .set('Authorization', `Bearer ${orgaToken}`)
      .expect(200);
    expect(body.filename).to.be.not.equal(orga.orgaPhotoFilename);
    expect(uploads.existingFiles).to.not.include(`orgas/${orga.orgaPhotoFilename}.png`);
  });
});
