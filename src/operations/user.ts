/* eslint-disable unicorn/no-null */
// We need to disable the no null to be able to nullify a database field

import bcrpyt from 'bcryptjs';
import { UserType } from '@prisma/client';
import database from '../services/database';
import nanoid from '../utils/nanoid';
import env from '../utils/env';
import { PrimitiveUser, User } from '../types';

export const formatUser = (user: PrimitiveUser): User => {
  if (!user) return null;

  return {
    ...user,
    hasPaid: false,
  };
};

export const fetchUser = async (parameterId: string, key = 'id'): Promise<User> => {
  const user = await database.user.findUnique({
    where: { [key]: parameterId },
    include: {
      cartItems: true,
    },
  });

  return formatUser(user);
};

export const createUser = async (
  username: string,
  firstname: string,
  lastname: string,
  email: string,
  password: string,
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
