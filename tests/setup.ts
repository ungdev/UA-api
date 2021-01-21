/* eslint-disable import/first*/
process.env.NODE_ENV = 'test';

import chai from 'chai';
import chaiString from 'chai-string';
import sinon from 'sinon';
import database from '../src/services/database';
import { setLoginAllowed, setShopAllowed } from '../src/operations/settings';

export const sandbox = sinon.createSandbox();

before(async () => {
  chai.use(chaiString);
  await setLoginAllowed(true);
  await setShopAllowed(true);
});

afterEach('Restore the sandbox after every tests', () => {
  sandbox.restore();
});

after(async () => {
  await setLoginAllowed(false);
  await setShopAllowed(false);

  await database.$disconnect();
});
