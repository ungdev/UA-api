import faker from 'faker';
import prisma, { TournamentId, UserType } from '@prisma/client';
import { createUser, fetchUser, removeUserRegisterToken, setPermissions } from '../src/operations/user';
import { Permission, User } from '../src/types';
import { createTeam, fetchTeam, joinTeam, lockTeam } from '../src/operations/team';
import { forcePay } from '../src/operations/carts';
import logger from '../src/utils/logger';

/**
 * Generate a fake username without dots, as it is prohibited in the validators
 */
export const generateFakerUsername = () => {
  let username: string;

  do {
    username = faker.internet.userName();
  } while (username.includes('.'));

  return username;
};

export const createFakeUser = async ({
  username = generateFakerUsername(),
  firstname = faker.name.firstName(),
  lastname = faker.name.lastName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  type = UserType.player,
  confirmed = true,
  paid = false,
  discordId = `${Math.floor(Date.now() * (1 + Math.random()))}`,
  permission,
}: {
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  type?: UserType;
  confirmed?: boolean;
  paid?: boolean;
  discordId?: string;
  permission?: Permission;
} = {}): Promise<User> => {
  const user: prisma.User = await createUser(username, firstname, lastname, email, password, discordId, type);
  logger.verbose(`Created user ${user.username}`);

  if (confirmed) {
    await removeUserRegisterToken(user.id);
  }

  if (paid) {
    await forcePay(user);
  }

  if (permission) {
    await setPermissions(user.id, [permission]);
  }

  return fetchUser(user.id);
};

export const createFakeTeam = async ({
  members = 1,
  tournament = TournamentId.lol,
  paid = false,
  locked = false,
  name,
  userPassword,
}: {
  members?: number;
  tournament?: TournamentId;
  paid?: boolean;
  locked?: boolean;
  name?: string;
  userPassword?: string;
} = {}) => {
  const password = userPassword || faker.internet.password();

  const user = await createFakeUser({ paid, password });
  const team = await createTeam(name || faker.internet.userName(), tournament, user.id, UserType.player);
  logger.verbose(`Created team ${team.name}`);

  if (locked) {
    await lockTeam(team.id);
  }

  // Create new members (minus 1 because the captain is already created)
  for (let index = 0; index < members - 1; index += 1) {
    const partner = await createFakeUser({ paid, password });
    await joinTeam(team.id, partner, UserType.player);
  }

  return fetchTeam(team.id);
};
