import env from './env';

export const encodeToBase64 = (object: object) => {
  const data = JSON.stringify(object);
  return Buffer.from(data).toString('base64');
};

// More info : https://stackoverflow.com/a/37511463
export const removeAccents = (string: string): string => string.normalize('NFD').replace(/[\u0300-\u036F]/g, '');

// Checks if the email ends with a school partner domain
export const isPartnerSchool = (email: string) => env.partners.emails.some((partner) => email.endsWith(partner));
