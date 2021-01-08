import { customAlphabet } from 'nanoid';
import env from './env';

export default customAlphabet(env.nanoid.alphabet, env.nanoid.length);

export const isValidNanoid = (token: string) => {
  if (token) {
    // Checks if every character of the string is in the alphabet and has the same length as a nanoid
    const regex = new RegExp(`^[${env.nanoid.alphabet}]{${env.nanoid.length}}$`);
    return token.match(regex);
  }

  return false;
};
