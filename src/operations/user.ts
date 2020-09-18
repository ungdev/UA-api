import { User } from '@prisma/client';
import db from '../../server';

export const fetchUsers = (): Promise<User[]> => {
  return db.user.findMany();
};

export const fetchUser = (id: string) => {
  return db.user.findOne({ where: { id } });
};
