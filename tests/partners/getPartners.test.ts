import { expect } from 'chai';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { Partner } from '@prisma/client';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as partnerOperations from '../../src/operations/partner';
import database from '../../src/services/database';
import { Error } from '../../src/types';
import nanoid from '../../src/utils/nanoid';

describe('GET /partners', () => {
  after(async () => {
    await database.partner.deleteMany();
  });

  before(async () => {
    const partnersList = [] as Partner[];

    for (let index = 0; index < 10; index++) {
      partnersList.push({
        id: nanoid(),
        name: faker.company.name(),
        link: faker.internet.url(),
        display: true,
      });
    }

    await database.partner.createMany({
      data: partnersList,
    });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(partnerOperations, 'fetchPartners').throws('Unexpected error');

    await request(app).get('/partners').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of partners', async () => {
    const partners = await database.partner.findMany();

    // add display false to a random tournament
    await database.partner.update({
      where: {
        id: partners[0].id,
      },
      data: {
        display: false,
      },
    });

    const response = await request(app).get('/partners').expect(200);

    expect(response.body).to.have.lengthOf(partners.length - 1);
    // Not to have tournaments[0] because it has display false
    expect(response.body).not.to.have.deep.members([partners[0]]);
    expect(response.body[0]).to.have.all.keys(['id', 'name', 'link']);
    expect(response.body[0].name).to.be.a('string');
    expect(response.body[0].link).to.be.a('string');
  });
});
