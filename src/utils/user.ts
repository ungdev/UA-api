import { Request } from 'express';
import { fetchUser } from '../operations/user';

export const getToken = (request: Request): string => {
  const authorization = request.get('Authorization');

  if (!authorization) {
    return '';
  }

  // Authorization header is of the form "Bearer {token}"
  const token = authorization.split(' ')[1];

  return token;
};

export const getUser = (request: Request) => fetchUser(getToken(request));
