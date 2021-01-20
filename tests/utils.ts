import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import faker from 'faker';
import prisma, { UserType } from '@prisma/client';
import { createUser, fetchUser } from '../src/operations/user';
import database from '../src/services/database';
import { User } from '../src/types';
import { createTeam, fetchTeam, joinTeam } from '../src/operations/team';

export const mock = new MockAdapter(axios);

export const createFakeConfirmedUser = async (type = UserType.player, password = 'awesomePassword'): Promise<User> => {
  const user: prisma.User = await createUser(
    faker.internet.userName(),
    faker.name.firstName(),
    faker.name.lastName(),
    faker.internet.email(),
    password,
    type,
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

export const createFakeTeam = async (members = 1, tournament = 'lol') => {
  const user = await createFakeConfirmedUser();
  const team = await createTeam(faker.internet.userName(), tournament, user.id);

  // Create new members (minus 1 because the captain is already created)
  for (let i = 0; i < members - 1; i += 1) {
    const partner = await createFakeConfirmedUser();
    await joinTeam(team.id, partner);
  }

  return fetchTeam(team.id);
};
