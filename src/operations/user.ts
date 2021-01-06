import { User } from '@prisma/client';
import database from '../services/database';

export const fetchUsers = (): Promise<User[]> => {
  return database.user.findMany();
};

export const fetchUser = (parameterId: string) => {
  return database.user.findOne({ where: { id: parameterId } });
};
