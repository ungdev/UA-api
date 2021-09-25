import { UserType } from '@prisma/client';
import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { updateAdminUser } from '../../src/operations/user';
import database from '../../src/services/database';
import { Error, User } from '../../src/types';
import { generateToken } from '../../src/utils/users';
import { createFakeUser } from '../utils';

describe('DELETE /users/current/spectate', () => {
  let user: User;
  let token: string;

  before(async () => {
    user = await createFakeUser();
    token = generateToken(user);
  });

  after(async () => {
    // Delete the user created
    await database.log.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail as user is not authenticated', () =>
    request(app).delete(`/users/current/spectate`).send().expect(401, { error: Error.Unauthenticated }));

  it('should fail as user has an invalid type', () =>
    request(app)
      .delete(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.CannotUnSpectate }));

  it('should return the new spectator user', async () => {
    const updatedUser = await updateAdminUser(user.id, { type: UserType.spectator });
    const response = await request(app)
      .delete(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return expect({
      ...response.body,
      updatedAt: null,
    }).to.been.deep.equal({
      ...updatedUser,
      type: null,
      updatedAt: null,
      createdAt: updatedUser.createdAt.toISOString(),
    });
  });

  it('should fail as user has no type', () =>
    request(app)
      .delete(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.CannotUnSpectate }));
});
