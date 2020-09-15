import { Request } from 'express';

export const getToken = (req: Request): string | null => {
  const authorization = req.get('authorization');

  if (!authorization) {
    return null;
  }

  const token = authorization.split(' ')[1];

  return token;
};
