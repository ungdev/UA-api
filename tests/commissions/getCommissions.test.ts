import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as commissionOperations from '../../src/operations/commission';
import database from '../../src/services/database';
import { Error } from '../../src/types';

describe('GET /commissions', () => {
  it('should fail with an internal server error', async () => {
    sandbox.stub(commissionOperations, 'fetchCommissions').throws('Unexpected error');

    await request(app).get('/commissions').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with a sorted array of commissions', async () => {
    const commissions = await database.commission.findMany();

    const response = await request(app).get('/commissions').expect(200);

    expect(response.body).to.have.lengthOf(commissions.length);
    let lastPosition = Number.NEGATIVE_INFINITY;
    for (const commission of response.body) {
      const databaseCommission = commissions.find((c) => c.id === commission.id);
      expect(databaseCommission).to.not.be.undefined;
      expect(commission.name).to.be.equal(databaseCommission.name);
      expect(commission.color).to.be.equal(databaseCommission.color);
      expect(commission.masterCommissionId).to.be.equal(databaseCommission.masterCommissionId);
      expect(commission).to.not.have.key('position');
      expect(lastPosition).to.be.lessThanOrEqual(databaseCommission.position);
      lastPosition = databaseCommission.position;
    }
  });
});
