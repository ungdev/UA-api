import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import faker from 'faker';
import prisma from '@prisma/client';
import { createUser, fetchUser } from '../src/operations/user';
import database from '../src/services/database';
import { User } from '../src/types';

export const mock = new MockAdapter(axios);

export const createFakeConfirmedUser = async (password = 'awesomePassword'): Promise<User> => {
  const user: prisma.User = await createUser(
    faker.internet.userName(),
    faker.name.firstName(),
    faker.name.lastName(),
    faker.internet.email(),
    password,
  );

  await database.user.update({
    data: {
      registerToken: null,
    },
    where: {
      id: user.id,
    },
  });

  return fetchUser(user.id);
};
