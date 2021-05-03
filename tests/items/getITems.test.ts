import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as itemOperations from '../../src/operations/item';
import database from '../../src/services/database';
import { Error } from '../../src/types';

describe('GET /items', () => {
  it('should fail with an internal server error', async () => {
    sandbox.stub(itemOperations, 'fetchItems').throws('Unexpected error');

    await request(app).get('/items').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of items', async () => {
    const items = await database.item.findMany();
    const response = await request(app).get('/items').expect(200);

    expect(response.body).to.have.lengthOf(items.length);
  });
});
