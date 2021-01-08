/* eslint-disable unicorn/no-null */
// We need to disable the no null to be able to nullify a database field

import bcrpyt from 'bcryptjs';
import { FindOneUserArgs, User, UserType } from '@prisma/client';
import database from '../services/database';
import nanoid from '../utils/nanoid';
import env from '../utils/env';

export const fetchUsers = (): Promise<User[]> => {
  return database.user.findMany();
};

export const fetchUser = (parameterId: string) => {
  return database.user.findOne({ where: { id: parameterId } });
};

export const fetchUserByEmail = (email: string) => {
  return database.user.findOne({ where: { email } });
};

export const fetchUserByRegisterToken = (registerToken: string) => {
  return database.user.findOne({ where: { registerToken } });
};

export const createUser = async (
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  password: string,
  discordId: string,
) => {
  const salt = await bcrpyt.genSalt(env.bcrypt.rounds);
  const hashedPassword = await bcrpyt.hash(password, salt);
  return database.user.create({
    data: {
      id: nanoid(),
      username,
      firstname,
      lastname,
      email,
      password: hashedPassword,
      discordId,
      type: UserType.player,
      registerToken: nanoid(),
    },
  });
};

export const removeUserRegisterToken = (user: User) => {
  return database.user.update({
    data: {
      registerToken: null,
    },
    where: {
      id: user.id,
    },
  });
};
