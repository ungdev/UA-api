import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types';
import env from './env';

export const getRequestUser = (response: Response): User | null => {
  return response.locals.user;
};

export const generateToken = (user: User) => {
  return jwt.sign({ userId: user.id }, env.jwt.secret, {
    expiresIn: env.jwt.expires,
  });
};

export const hasPaid = (user: User) => {
  return false;
};
