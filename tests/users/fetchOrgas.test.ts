import request from 'supertest';
import { Commission, RoleInCommission } from '@prisma/client';
import { expect } from 'chai';
import app from '../../src/app';
import { Error, Permission, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';

describe('GET /users/orgas', () => {
  let developmentRespo: User;
  let developmentMember: User;
  let networkRespo: User;

  before(async () => {
    // Do all transactions at one
    const transactions: Promise<User>[] = [
      // Create a random user
      createFakeUser(),
      // Create the respo of commission dev
      createFakeUser({
        permissions: [Permission.orga, Permission.admin],
        orgaRoles: [{ commission: Commission.dev, role: RoleInCommission.respo }],
      }),
      // Create 1 dev member
      createFakeUser({
        permissions: [Permission.orga],
        orgaRoles: [{ commission: Commission.dev, role: RoleInCommission.member }],
      }),
      // Create another dev member who is also respo rozo
      createFakeUser({
        permissions: [Permission.orga],
        orgaRoles: [
          { commission: Commission.rozo, role: RoleInCommission.respo },
          { commission: Commission.dev, role: RoleInCommission.member },
        ],
      }),
    ];
    [, developmentRespo, developmentMember, networkRespo] = await Promise.all(transactions);
  });

  after(async () => {
    await database.orgaRole.deleteMany();
    await database.user.deleteMany();
  });

  it('should fail with a server error', () => {
    sandbox.stub(userOperations, 'fetchOrgas').throws('Unexpected error');

    return request(app).get(`/users/orgas`).send().expect(500, { error: Error.InternalServerError });
  });

  it('should successfully return the list of organisers, along with their commissions and role in each one of them', async () => {
    const { body } = await request(app).get('/users/orgas').send().expect(200);
    expect(body).to.be.an('array').with.length(3);
    const orgas = [developmentRespo, developmentMember, networkRespo];
    for (const orga of body) {
      const orgaUser = orgas.find((o) => o.id === orga.id);
      expect(orgaUser).to.not.be.undefined;
      expect(orga.firstname).to.be.equal(orgaUser.firstname);
      expect(orga.lastname).to.be.equal(orgaUser.lastname);
      if (orgaUser === developmentRespo) {
        expect(orga.commissions).to.have.keys(Commission.dev);
        expect(orga.commissions.dev).to.be.equal(RoleInCommission.respo);
      } else if (orgaUser === developmentMember) {
        expect(orga.commissions).to.have.keys(Commission.dev);
        expect(orga.commissions.dev).to.be.equal(RoleInCommission.member);
      } else {
        expect(orga.commissions).to.have.keys(Commission.rozo, Commission.dev);
        expect(orga.commissions.rozo).to.be.equal(RoleInCommission.respo);
        expect(orga.commissions.dev).to.be.equal(RoleInCommission.member);
      }
    }
  });
});
