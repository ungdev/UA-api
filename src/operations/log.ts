import database from '../services/database';
import nanoid from '../utils/nanoid';

export const createLog = (method: string, path: string, userId: string, body: object | undefined) => {
  const safeBody = {};

  // Remove all the keys from the body container the word password to avoid logging plain text passwords
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (!key.toLowerCase().includes('password')) {
        // @ts-ignore
        safeBody[key] = value;
      }
    }
  }

  return database.log.create({
    data: {
      id: nanoid(),
      method,
      path,
      body: safeBody,
      user: { connect: { id: userId } },
    },
  });
};
