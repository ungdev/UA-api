// Setup all environment variables
/* eslint-disable import/first*/
process.env.NODE_ENV = 'test';

import chai, { expect } from 'chai';
import chaiString from 'chai-string';
import sinon from 'sinon';
import database from '../src/services/database';
import { setLoginAllowed, setShopAllowed } from '../src/operations/settings';
import { transporter } from '../src/services/email';

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
  // Reset the database at it was
  await setLoginAllowed(false);
  await setShopAllowed(false);

  // Check that there is all tests where cleaning all their data. It is to prevent data concurrency
  // We check only tables that have dynamic data. (not seeded staticly)
  const userCount = await database.user.count();
  expect(userCount).to.be.equal(0);

  const teamCount = await database.team.count();
  expect(teamCount).to.be.equal(0);

  const cartCount = await database.cart.count();
  expect(cartCount).to.be.equal(0);

  const cartItemCount = await database.cartItem.count();
  expect(cartItemCount).to.be.equal(0);

  await database.$disconnect();
  transporter.close();
});
