import { Response } from 'express';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import { Team, User } from '../types';
import env from './env';

export const getRequestInfo = (response: Response) => ({
  user: response.locals.user as User,
  team: response.locals.team as Team,
});

export const generateToken = (user: User) =>
  jwt.sign({ userId: user.id }, env.jwt.secret, {
    expiresIn: env.jwt.expires as ms.StringValue,
  });
