import { FindManyUserArgs, User } from '@prisma/client';
import database from '../utils/database';

export const fetchUsers = (where = {}): Promise<User[]> => {
  return database.user.findMany(where);
};

export const fetchUser = (id: string) => {
  return database.user.findOne({ where: { id } });
};

export const createUser = (user: User) => {
  return database.user.create({
    data: {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      password: user.password,
      type: user.type,
    },
  });
};
