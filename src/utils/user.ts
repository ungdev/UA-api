import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types';
import env from './env';

export const getRequestInfo = (response: Response) => ({
  user: response.locals.user,
  team: response.locals.team,
});

export const generateToken = (user: User) =>
  jwt.sign({ userId: user.id }, env.jwt.secret, {
    expiresIn: env.jwt.expires,
  });
