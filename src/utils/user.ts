import { Response } from 'express';
import { User } from '../types';

export const getRequestUser = (response: Response): User | null => {
  return response.locals.user;
};
