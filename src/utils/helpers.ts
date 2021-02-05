/* eslint-disable unicorn/prefer-spread */
// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1068
// known as a bug that will be fixed soon

import crypto from 'crypto';
import env from './env';
import * as validators from './validators';

export const encodeToBase64 = (object: object) => {
  const data = JSON.stringify(object);
  return Buffer.from(data).toString('base64');
};

export const decodeFromBase64 = (string: string) => {
  const buffer = Buffer.from(string, 'base64');

  return JSON.parse(buffer.toString());
};

/**
 * Encrypts the user id with 128 bits AES encryption.
 * A 128 bits encryption is largly enough for our usages
 * @param userId userId to be encrypted
 */
export const encryptQrCode = (userId: string) => {
  // Transform the key and the initial vector from base64 to binary
  const key = Buffer.from(env.qrcode.key, 'base64');
  const initialVector = Buffer.from(env.qrcode.initialVector, 'base64');

  const cipher = crypto.createCipheriv('aes-128-cbc', key, initialVector);

  // Return the encrypted buffer
  return Buffer.concat([cipher.update(userId), cipher.final()]);
};

/**
 *
 * @param binary Binary encrypted.
 */
export const decryptQrCode = (encrypted: Buffer) => {
  // Transform the key and the initial vector from base64 to binary
  const key = Buffer.from(env.qrcode.key, 'base64');
  const initialVector = Buffer.from(env.qrcode.initialVector, 'base64');

  // Create a decipher
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, initialVector);

  // Decrypts the data
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString();
};

// More info : https://stackoverflow.com/a/37511463
export const removeAccents = (string: string): string => string.normalize('NFD').replace(/[\u0300-\u036F]/g, '');

export const formatPrice = (cents: number) => {
  const euros = cents / 100;
  return euros.toLocaleString('fr-fr', { style: 'currency', currency: 'EUR' });
};

// Checks if the email ends with a school partner domain
export const isPartnerSchool = (email: string) => env.email.partners.some((partner) => email.endsWith(partner));

export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
