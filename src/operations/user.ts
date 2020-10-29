import { FindManyUserArgs, User } from '@prisma/client';
import database from '../utils/database';

export const fetchUsers = (argument: FindManyUserArgs = {}): Promise<User[]> => {
  return database.user.findMany(argument);
};

export const fetchUser = (parameterId: string) => {
  return database.user.findOne({ where: { id: parameterId } });
};

export const createUser = (user: User) => {
  return database.user.create({
    data: {
      id: user.id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      password: user.password,
      type: user.type,
      discordId: user.discordId,
      registerToken: user.registerToken,
    },
  });
};
