import { Request } from 'express';
import { fetchUser } from '../operations/user';
import UserModel from '../models/user';

const getToken = (req: Request): string => {
  const authorization = req.get('Authorization');

  if (!authorization) {
    return null;
  }

  // Authorization header is of the form "Bearer {token}"
  const token = authorization.split(' ')[1];

  return token;
};

export const getUser = (req: Request): Promise<UserModel> => fetchUser(getToken(req));
