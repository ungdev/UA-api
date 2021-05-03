import { customAlphabet } from 'nanoid';
import env from './env';

export default customAlphabet(env.nanoid.alphabet, env.nanoid.length);
