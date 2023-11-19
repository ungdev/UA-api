import request from 'supertest';
import { RoleInCommission } from '@prisma/client';
import { expect } from 'chai';
import app from '../../src/app';
import { Error, Permission, User } from '../../src/types';
import { createFakeUser } from '../utils';
import { sandbox } from '../setup';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';
import { fetchCommission } from '../../src/operations/commission';
import { fetchSetting, setTrombiAllowed } from "../../src/operations/settings";

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
        orgaRoles: [{ commission: 'dev', role: RoleInCommission.respo }],
      }),
      // Create 1 dev member
      createFakeUser({
        permissions: [Permission.orga],
        orgaRoles: [{ commission: 'dev', role: RoleInCommission.member }],
      }),
      // Create another dev member who is also respo rozo
      createFakeUser({
        permissions: [Permission.orga],
        orgaRoles: [
          { commission: 'rozo', role: RoleInCommission.respo },
          { commission: 'dev', role: RoleInCommission.member },
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

  it('should fail as the trombi is not enabled', async () => {
    await setTrombiAllowed(false);
    await request(app).get('/users/orgas').send().expect(403, { error: Error.TrombiNotAllowed });
    await setTrombiAllowed(true);
  });

  it('should successfully return the list of organisers, along with their commissions and role in each one of them', async () => {
    const { body } = await request(app).get('/users/orgas').send().expect(200);
    expect(body).to.be.an('array').with.length(2);
    // Make sure we don't get the same commission twice (if this ever fails. Please. Call me)
    expect(body[0].id).to.be.not.equal(body[1].id);
    const lastCommissionPosition = Number.NEGATIVE_INFINITY;
    for (const bodyCommission of body) {
      const commission = await fetchCommission(bodyCommission.id);
      expect(commission.position).to.be.greaterThanOrEqual(lastCommissionPosition);
      expect(['dev', 'rozo']).to.contain(commission.id);
      expect(bodyCommission.name).to.be.equal(commission.name);
      expect(bodyCommission.masterCommission).to.be.equal(commission.masterCommissionId);
      expect(bodyCommission.roles.respo).to.have.length(1);
      if (commission.id === 'dev') {
        expect(bodyCommission.roles.respo[0].id).to.be.equal(developmentRespo.id);
        expect(bodyCommission.roles.respo[0].firstname).to.be.equal(developmentRespo.firstname);
        expect(bodyCommission.roles.respo[0].lastname).to.be.equal(developmentRespo.lastname);
        expect(bodyCommission.roles.member).to.have.length(2);
        const developmentMemberIndex = bodyCommission.roles.member[0].id === developmentMember.id ? 0 : 1;
        const networkRespoIndex = developmentMemberIndex === 0 ? 1 : 0;
        expect(bodyCommission.roles.member[developmentMemberIndex].id).to.be.equal(developmentMember.id);
        expect(bodyCommission.roles.member[developmentMemberIndex].firstname).to.be.equal(developmentMember.firstname);
        expect(bodyCommission.roles.member[developmentMemberIndex].lastname).to.be.equal(developmentMember.lastname);
        expect(bodyCommission.roles.member[networkRespoIndex].id).to.be.equal(networkRespo.id);
        expect(bodyCommission.roles.member[networkRespoIndex].firstname).to.be.equal(networkRespo.firstname);
        expect(bodyCommission.roles.member[networkRespoIndex].lastname).to.be.equal(networkRespo.lastname);
      } else {
        expect(bodyCommission.roles.respo[0].id).to.be.equal(networkRespo.id);
        expect(bodyCommission.roles.respo[0].firstname).to.be.equal(networkRespo.firstname);
        expect(bodyCommission.roles.respo[0].lastname).to.be.equal(networkRespo.lastname);
        expect(bodyCommission.roles.member).to.be.empty;
      }
    }
  });
});
