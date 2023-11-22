// Setup all environment variables
/* eslint-disable import/first*/
process.env.NODE_ENV = 'test';

// Load the environment variables before loading prisma
/* eslint-disable import/order */
import env from '../src/utils/env';
import chai, { expect } from 'chai';
import chaiString from 'chai-string';
import sinon from 'sinon';
import database from '../src/services/database';
import { setLoginAllowed, setShopAllowed, setTrombiAllowed } from '../src/operations/settings';
import { transporter } from '../src/services/email';
import { disableFakeDiscordApi, enableFakeDiscordApi } from './discord';
import { disableFakeUploadApi, enableFakeUploadApi } from './upload';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import * as uploads from './upload'

export const sandbox = sinon.createSandbox();

before(async () => {
  // Reset and seed the database
  execSync('pnpm test:schema:push --force-reset');
  await Promise.all(
    readFileSync(`seed.sql`, 'utf-8')
      .split(';')
      .slice(0, -1)
      .map((command) => database.$executeRawUnsafe(command)),
  );
  chai.use(chaiString);
  await setLoginAllowed(true);
  await setShopAllowed(true);
  await setTrombiAllowed(true);

  enableFakeDiscordApi();
  enableFakeUploadApi();

  // Verify environment variables have been loaded correctly
  expect(process.env.API_PORT).to.be.undefined;
  expect(env.api.port).to.be.undefined;
});

afterEach('Restore the sandbox after every tests', () => {
  sandbox.restore();
});

after(async () => {
  disableFakeDiscordApi();
  disableFakeUploadApi();

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

  const repoItemCount = await database.repoItem.count();
  expect(repoItemCount).to.be.equal(0);

  const repoLogCount = await database.repoLog.count();
  expect(repoLogCount).to.be.equal(0);

  const orgaRoleCount = await database.orgaRole.count();
  expect(orgaRoleCount).to.be.equal(0);

  await database.$disconnect();
  transporter.close();

  // Verify environment variables have not changed
  expect(process.env.API_PORT).to.be.undefined;
  expect(env.api.port).to.be.undefined;
  expect(uploads.existingFiles).to.be.deep.equal(uploads.INITIAL_EXISTING_FILES);
});
