import { expect } from 'chai';
import { encryptQrCode, decryptQrCode } from '../../src/utils/helpers';

describe('Test helpers', () => {
  it('should get the same data after encrypt and decryption', () => {
    const userId = 'A1B2C3';
    const encrypted = encryptQrCode(userId);
    const decrypted = decryptQrCode(encrypted);

    expect(decrypted).to.be.equal(userId);
  });
});
