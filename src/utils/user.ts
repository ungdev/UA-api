import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import env from './env';

export const getRequestUser = (response: Response): User | null => {
  return response.locals.user;
};

export const generateToken = (user: User) => {
  jwt.sign({ id: user.id }, env.jwt.secret, {
    expiresIn: env.jwt.expires,
  });
};
