import { expect } from 'chai';
import { encrypt, decrypt } from '../../src/utils/helpers';

describe('Test helpers', () => {
  it('should get the same data after encrypt and decryption', () => {
    const userId = 'A1B2C3';
    const encrypted = encrypt(userId);
    const decrypted = decrypt(encrypted);

    expect(decrypted).to.be.equal(userId);
  });
});
