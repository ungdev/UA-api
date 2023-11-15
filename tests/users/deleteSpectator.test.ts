import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import database from '../../src/services/database';
import { Error, User, UserType } from '../../src/types';
import { generateToken } from '../../src/utils/users';
import { createFakeUser } from '../utils';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';

describe('DELETE /users/current/spectate', () => {
  let user: User;
  let token: string;

  before(async () => {
    user = await createFakeUser({ type: UserType.player });
    token = generateToken(user);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
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

  it('should fail with a server error', async () => {
    user = await userOperations.updateAdminUser(user.id, { type: UserType.spectator });
    sandbox.stub(userOperations, 'updateAdminUser').throws('Unexpected error');

    return request(app)
      .delete(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fail because user has already paid', async () => {
    const paidUser = await createFakeUser({ type: UserType.spectator, paid: true });
    const paidToken = generateToken(paidUser);

    return request(app)
      .delete(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${paidToken}`)
      .expect(403, { error: Error.AlreadyPaid });
  });

  it('should return the new spectator user', async () => {
    const response = await request(app)
      .delete(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return expect({
      ...response.body,
      updatedAt: null,
    }).to.been.deep.equal({
      ...user,
      type: null,
      updatedAt: null,
      createdAt: user.createdAt.toISOString(),
    });
  });

  it('should fail as user has no type', () =>
    request(app)
      .delete(`/users/current/spectate`)
      .send()
      .set('Authorization', `Bearer ${token}`)
      .expect(403, { error: Error.CannotUnSpectate }));
});
