import { UserType } from '@prisma/client';
import request from 'supertest';
import { expect } from 'chai';
import { generateToken } from '../../src/utils/users';
import { createFakeUser } from '../utils';
import { Error, User } from '../../src/types';
import database from '../../src/services/database';
import app from '../../src/app';
import { updateAdminUser } from '../../src/operations/user';

describe('POST /users/current/spectate', () => {
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
    request(app).post(`/users/current/spectate`).send().expect(401, { error: Error.Unauthenticated }));

  it('should fail as user has already a type', () =>
    request(app)
      .post(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.CannotSpectate }));

  it('should return the new spectator user', async () => {
    const updatedUser = await updateAdminUser(user.id, { type: null });
    const response = await request(app)
      .post(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return expect({
      ...response.body,
      updatedAt: null,
    }).to.been.deep.equal({
      ...updatedUser,
      type: UserType.spectator,
      updatedAt: null,
      createdAt: updatedUser.createdAt.toISOString(),
    });
  });
});
