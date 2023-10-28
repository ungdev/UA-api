import { expect } from 'chai';

describe('Test env', () => {
  it('should load the environment variables of development environment', async () => {
    // Remove env module from file to allow re-importing
    delete require.cache[require.resolve('../../src/utils/env')];
    // Backup process.env
    const envBackup = { ...process.env };
    process.env.NODE_ENV = 'development';
    // dotenv does not override existing variables
    delete process.env.DATABASE_URL;
    await import('../../src/utils/env');
    // We can't assume there is a .env file somewhere
    // (tests should only work with a very small amount of environment variables)
    // The best we can do is assume the test database is not the same as the development database
    // (this one may be undefined if there is no .env file, but it would still be different)
    expect(process.env.DATABASE_URL).to.not.be.equal(envBackup.DATABASE_URL);
    // Rollback changes to process.env
    process.env = envBackup;
  });
});
