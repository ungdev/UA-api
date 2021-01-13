/* eslint-disable import/first*/
process.env.NODE_ENV = 'test';

import chai from 'chai';
import sinon from 'sinon';
import { setLoginAllowed } from '../src/operations/settings';
import database from '../src/services/database';

export const sandbox = sinon.createSandbox();

before(async () => {
  chai.should();
  await setLoginAllowed(true);
});

afterEach('Restore the sandbox after every tests', () => {
  sandbox.restore();
});

after(async () => {
  await setLoginAllowed(false);

  await database.$disconnect();
});
