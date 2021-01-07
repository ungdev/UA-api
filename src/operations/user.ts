import { User, UserType } from '@prisma/client';
import database from '../services/database';
import nanoid from '../utils/nanoid';

export const fetchUsers = (): Promise<User[]> => {
  return database.user.findMany();
};

export const fetchUser = (parameterId: string) => {
  return database.user.findOne({ where: { id: parameterId } });
};

export const createUser = (
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  password: string,
  discordId: string,
) => {
  return database.user.create({
    data: {
      id: nanoid(),
      username,
      firstname,
      lastname,
      email,
      password,
      discordId,
      type: UserType.player,
    },
  });
};
