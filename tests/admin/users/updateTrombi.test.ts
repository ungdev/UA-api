import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as userOperation from '../../../src/operations/user';
import database from '../../../src/services/database';
import { Error, Permission, RawOrgaWithUserData, User, UserType } from '../../../src/types';
import { createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';
import { fetchOrga } from '../../../src/operations/user';
import * as uploads from '../../upload';

describe('PATCH /admin/users/trombi', () => {
  let nonOrgaUser: User;
  let orgaUser: User;
  let orgaOrganizerInfo: RawOrgaWithUserData;
  let orgaToken: string;

  before(async () => {
    orgaUser = await createFakeUser({ permissions: [Permission.orga] });
    orgaOrganizerInfo = await fetchOrga(orgaUser);
    nonOrgaUser = await createFakeUser({ type: UserType.player });
    orgaToken = generateToken(orgaUser);
  });

  after(async () => {
    await database.orga.deleteMany();
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
    expect(orgaOrganizerInfo.displayName).to.be.false;
    expect(orgaOrganizerInfo.displayPhoto).to.be.false;
    expect(orgaOrganizerInfo.displayUsername).to.be.true;
    const { body } = await request(app)
      .patch(`/admin/users/trombi`)
      .set('Authorization', `Bearer ${orgaToken}`)
      .send({ displayName: true, displayPhoto: true, displayUsername: false })
      .expect(200);
    orgaOrganizerInfo = await fetchOrga(orgaUser);
    expect(orgaOrganizerInfo.displayName).to.be.true;
    expect(orgaOrganizerInfo.displayPhoto).to.be.true;
    expect(orgaOrganizerInfo.displayUsername).to.be.false;
    expect(body.filename).to.startWith(orgaUser.lastname);
    expect(body.filename).to.be.equal(orgaOrganizerInfo.photoFilename);
  });

  it('should successfully update the user and delete the old image', async () => {
    // First actually add the file at the specified location
    uploads.existingFiles.push(`orgas/${orgaOrganizerInfo.photoFilename}.png`);
    const { body } = await request(app)
      .patch(`/admin/users/trombi`)
      .send({ displayName: true, displayPhoto: true, displayUsername: true })
      .set('Authorization', `Bearer ${orgaToken}`)
      .expect(200);
    expect(body.filename).to.be.not.equal(orgaOrganizerInfo.photoFilename);
    expect(uploads.existingFiles).to.not.include(`orgas/${orgaOrganizerInfo.photoFilename}.png`);
  });
});
