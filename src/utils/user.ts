import { Request, Response } from 'express';
import { User } from '../types';

export const getToken = (request: Request): string => {
  const authorization = request.get('Authorization');

  if (!authorization) {
    return '';
  }

  // Authorization header is of the form "Bearer {token}"
  const token = authorization.split(' ')[1];

  return token;
};

export const getRequestUser = (response: Response): User | null => {
  return response.locals.user;
};
