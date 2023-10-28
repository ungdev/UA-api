import request from 'supertest';
import { expect } from 'chai';
import app from '../../../src/app';
import { createFakeTeam, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, TransactionState, User, UserType } from '../../../src/types';
import * as userOperations from '../../../src/operations/user';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import { forcePay } from '../../../src/operations/carts';
import { lockTeam } from '../../../src/operations/team';

describe('GET /admin/scan/', () => {
  let users: User[] = [];
  let admin: User;
  let adminToken: string;

  before(async () => {
    for(let i = 0; i < 10; i++) {
      const team = await createFakeTeam({
        members: 1,
      });
      users.push(...team.players);
      await forcePay(users[i]);
      await lockTeam(team.id);
    }

    // add 3 spectators
    for(let i = 0; i < 3; i++) {
      const user = await createFakeUser({
        type: UserType.spectator
      });
      await forcePay(user);
      users.push(user);
    }

    // scan first and last user
    await userOperations.scanUser(users[0].id);
    await userOperations.scanUser(users[users.length - 1].id);

    admin = await createFakeUser({ permissions: [Permission.entry] });
    adminToken = generateToken(admin);
  });

  after(async () => {
    // Delete the user created
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).get('/admin/scan').expect(401, { error: Error.Unauthenticated }));

  it('should error as the user has no permissions', () => {
    const userToken = generateToken(users[0]);
    return request(app)
      .get('/admin/scan')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should throw an internal server error', async () => {
    // Fake the main function to throw
    sandbox.stub(userOperations, 'getPaidAndValidatedUsers').throws('Unexpected error');

    // Request to login
    await request(app)
      .get('/admin/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should return scan stats', async () => {
    const userData = await request(app)
      .get('/admin/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(userData.body.totalToScan).to.be.equal(13);
    expect(userData.body.alreadyScanned).to.be.equal(2);
  });
});
