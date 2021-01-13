import chai from 'chai';
import sinon from 'sinon';
import { setLoginAllowed } from '../src/operations/settings';

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
});
