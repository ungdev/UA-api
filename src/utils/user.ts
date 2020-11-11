import { Response } from 'express';
import { User } from '@prisma/client';

export const getRequestUser = (response: Response): User | null => {
  return response.locals.user;
};
