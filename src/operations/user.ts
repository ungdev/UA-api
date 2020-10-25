import { User } from '@prisma/client';
import database from '../utils/database';

export const fetchUsers = (): Promise<User[]> => {
  return database.user.findMany();
};

export const fetchUser = (parameterId: string) => {
  return database.user.findOne({ where: { id: parameterId } });
};
